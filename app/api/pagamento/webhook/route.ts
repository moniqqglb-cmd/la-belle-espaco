import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function sobrepoe(
  inicioA: Date,
  fimA: Date,
  inicioB: Date,
  fimB: Date
) {
  return inicioA < fimB && fimA > inicioB;
}

export async function POST(request: NextRequest) {
  let supabaseUrl = "";
  let supabaseKey = "";
  let orderNsu = "";

  try {
    const body = await request.json();

    orderNsu = String(body.order_nsu || "");
    const transactionNsu = String(body.transaction_nsu || "");
    const slug = String(body.invoice_slug || "");

    if (
      !/^LB-[0-9a-f-]{36}$/i.test(orderNsu) ||
      !transactionNsu ||
      !slug
    ) {
      return NextResponse.json(
        { erro: "Identificadores do pagamento incompletos." },
        { status: 400 }
      );
    }

    supabaseUrl = process.env.SUPABASE_URL || "";
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const infinitePayKey = process.env.INFINITEPAY_API_KEY || "";
    const infinitePayHandle = process.env.INFINITEPAY_HANDLE || "";

    if (
      !supabaseUrl ||
      !supabaseKey ||
      !infinitePayKey ||
      !infinitePayHandle
    ) {
      throw new Error("Configuração do servidor incompleta.");
    }

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    };

    // Consulta o pedido.
    const consulta = await fetch(
      `${supabaseUrl}/rest/v1/agendamentos_pagamentos?order_nsu=eq.${encodeURIComponent(orderNsu)}&select=*`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!consulta.ok) {
      throw new Error("Falha ao consultar o pedido.");
    }

    const pedidos = await consulta.json();
    const pedido = pedidos[0];

    if (!pedido) {
      return NextResponse.json(
        { erro: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (pedido.evento_google_id && pedido.status === "agendado") {
      return NextResponse.json({ recebido: true });
    }

    // Confirma o pagamento diretamente com a InfinitePay.
    const verificacao = await fetch(
      "https://api.checkout.infinitepay.io/payment_check",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": infinitePayKey,
        },
        body: JSON.stringify({
          handle: infinitePayHandle,
          order_nsu: orderNsu,
          transaction_nsu: transactionNsu,
          slug,
        }),
        cache: "no-store",
      }
    );

    if (!verificacao.ok) {
      throw new Error("Falha na verificação da InfinitePay.");
    }

    const pagamento = await verificacao.json();

    if (
      pagamento.success !== true ||
      pagamento.paid !== true ||
      Number(pagamento.amount) !== Number(pedido.sinal_centavos)
    ) {
      return NextResponse.json(
        { erro: "Pagamento não confirmado ou valor incorreto." },
        { status: 400 }
      );
    }

    // Só processamos pedidos da agenda da Monique.
    if (pedido.profissional !== "Dra. Monique Gomes") {
      throw new Error("Profissional não habilitada.");
    }

    // Registra o pagamento confirmado.
    if (pedido.status === "pendente") {
      const atualizacao = await fetch(
        `${supabaseUrl}/rest/v1/agendamentos_pagamentos?order_nsu=eq.${encodeURIComponent(orderNsu)}&status=eq.pendente`,
        {
          method: "PATCH",
          headers: {
            ...headers,
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            status: "pago",
            transaction_nsu: transactionNsu,
            atualizado_em: new Date().toISOString(),
          }),
        }
      );

      if (!atualizacao.ok) {
        throw new Error("Falha ao registrar o pagamento.");
      }
    } else if (
      pedido.status !== "pago" ||
      pedido.transaction_nsu !== transactionNsu
    ) {
      return NextResponse.json(
        { erro: "Pedido não pode ser processado." },
        { status: 409 }
      );
    }

    // Pagamento posterior ao vencimento: não marca automaticamente.
    if (
      !pedido.expira_em ||
      new Date(pedido.expira_em).getTime() <= Date.now()
    ) {
      console.error(
        "PAGAMENTO APROVADO COM RESERVA EXPIRADA:",
        orderNsu
      );

      return NextResponse.json({
        recebido: true,
        pagamento_confirmado: true,
        agendamento_pendente_de_verificacao: true,
      });
    }

    // Impede dois processamentos simultâneos do mesmo pedido.
    const processamento = await fetch(
      `${supabaseUrl}/rest/v1/rpc/iniciar_processamento_pagamento`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          p_order_nsu: orderNsu,
        }),
        cache: "no-store",
      }
    );

    if (!processamento.ok) {
      throw new Error("Falha ao iniciar o processamento.");
    }

    const podeProcessar = await processamento.json();

    if (podeProcessar !== true) {
      return NextResponse.json({ recebido: true });
    }

    try {
      const [ano, mes, dia] = pedido.data_agendamento
        .split("-")
        .map(Number);

      const [hora, minuto] = pedido.horario
        .split(":")
        .map(Number);

      const inicio = new Date(
        `${pedido.data_agendamento}T${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}:00-03:00`
      );

      const fim = new Date(
        inicio.getTime() + Number(pedido.duracao) * 60000
      );

      if (
        !Number.isFinite(inicio.getTime()) ||
        inicio.getTime() <= Date.now()
      ) {
        throw new Error("O horário reservado já passou.");
      }

      // Confere novamente se a reserva ainda está válida.
      const reservaAtual = await fetch(
        `${supabaseUrl}/rest/v1/agendamentos_pagamentos?order_nsu=eq.${encodeURIComponent(orderNsu)}&select=status,expira_em,evento_google_id`,
        {
          headers,
          cache: "no-store",
        }
      );

      if (!reservaAtual.ok) {
        throw new Error("Não foi possível conferir a reserva.");
      }

      const dadosReserva = (await reservaAtual.json())[0];

      if (
        !dadosReserva ||
        dadosReserva.status !== "pago" ||
        dadosReserva.evento_google_id ||
        !dadosReserva.expira_em ||
        new Date(dadosReserva.expira_em).getTime() <= Date.now()
      ) {
        throw new Error("A reserva expirou ou não está disponível.");
      }

      // Verifica outros agendamentos ativos no banco.
      const reservasResponse = await fetch(
        `${supabaseUrl}/rest/v1/agendamentos_pagamentos?data_agendamento=eq.${encodeURIComponent(pedido.data_agendamento)}&select=order_nsu,horario,duracao,status,expira_em&or=${encodeURIComponent(`(status.eq.pago,status.eq.agendado,and(status.eq.pendente,expira_em.gt.${new Date().toISOString()}))`)}`,
        {
          headers,
          cache: "no-store",
        }
      );

      if (!reservasResponse.ok) {
        throw new Error("Falha ao verificar outras reservas.");
      }

      const reservas = await reservasResponse.json();

      const conflitoBanco = reservas.some((reserva: any) => {
        if (reserva.order_nsu === orderNsu) return false;

        const [h, m] = reserva.horario.split(":").map(Number);

        const outroInicio = new Date(
          `${pedido.data_agendamento}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00-03:00`
        );

        const outroFim = new Date(
          outroInicio.getTime() + Number(reserva.duracao) * 60000
        );

        return sobrepoe(inicio, fim, outroInicio, outroFim);
      });

      if (conflitoBanco) {
        throw new Error("O horário foi ocupado por outra reserva.");
      }

      // Recupera a conexão da agenda da Monique.
      const tokenDb = await fetch(
        `${supabaseUrl}/rest/v1/google_calendar_tokens?id=eq.monique&select=refresh_token`,
        {
          headers,
          cache: "no-store",
        }
      );

      if (!tokenDb.ok) {
        throw new Error("Falha ao consultar conexão do Google.");
      }

      const tokenRows = await tokenDb.json();
      const refreshToken = tokenRows[0]?.refresh_token;

      if (!refreshToken) {
        throw new Error("Agenda da Monique não conectada.");
      }

      // Renova o token Google.
      const tokenResponse = await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
          cache: "no-store",
        }
      );

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error("Não foi possível acessar o Google Agenda.");
      }

      // Confere novamente a disponibilidade no Google.
      const busyResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/freeBusy",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timeMin: inicio.toISOString(),
            timeMax: fim.toISOString(),
            timeZone: "America/Sao_Paulo",
            items: [{ id: "primary" }],
          }),
          cache: "no-store",
        }
      );

      const busyData = await busyResponse.json();

      if (!busyResponse.ok) {
        throw new Error("Falha ao consultar disponibilidade no Google.");
      }

      const busy = busyData.calendars?.primary?.busy || [];

      const conflitoGoogle = busy.some(
        (period: { start: string; end: string }) =>
          sobrepoe(
            inicio,
            fim,
            new Date(period.start),
            new Date(period.end)
          )
      );

      if (conflitoGoogle) {
        throw new Error("O horário já está ocupado no Google Agenda.");
      }

      // ID determinístico: uma nova tentativa usa o mesmo evento.
      const eventId = orderNsu
        .replace(/^LB-/i, "")
        .replace(/-/g, "")
        .toLowerCase();

      const eventUrl =
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

      const eventBody = {
        id: eventId,
        summary: `${pedido.servico} - ${pedido.cliente_nome}`,
        description: [
          `Cliente: ${pedido.cliente_nome}`,
          `Telefone: ${pedido.cliente_telefone}`,
          `Procedimento: ${pedido.servico}`,
          `Profissional: ${pedido.profissional}`,
          `Pedido: ${orderNsu}`,
          "Sinal confirmado pela InfinitePay.",
          "Agendamento realizado pelo site La Belle Espaço.",
        ].join("\n"),
        start: {
          dateTime: inicio.toISOString(),
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: fim.toISOString(),
          timeZone: "America/Sao_Paulo",
        },
      };

      // Primeiro tenta recuperar um evento de uma tentativa anterior.
      let eventData: any = null;

      const eventoExistente = await fetch(eventUrl, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        cache: "no-store",
      });

      if (eventoExistente.ok) {
        eventData = await eventoExistente.json();

        if (
          eventData.extendedProperties?.private?.order_nsu !== orderNsu
        ) {
          throw new Error("Identificador de evento já utilizado.");
        }
      } else if (eventoExistente.status === 404) {
        const criarEvento = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...eventBody,
              extendedProperties: {
                private: {
                  order_nsu: orderNsu,
                },
              },
            }),
          }
        );

        eventData = await criarEvento.json();

        if (!criarEvento.ok) {
          // Outra tentativa pode ter criado o mesmo evento.
          if (criarEvento.status === 409) {
            const recuperar = await fetch(eventUrl, {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
              },
              cache: "no-store",
            });

            if (!recuperar.ok) {
              throw new Error("Não foi possível recuperar o evento.");
            }

            eventData = await recuperar.json();

            if (
              eventData.extendedProperties?.private?.order_nsu !==
              orderNsu
            ) {
              throw new Error("Evento existente não corresponde ao pedido.");
            }
          } else {
            throw new Error("Não foi possível criar o compromisso.");
          }
        }
      } else {
        throw new Error("Não foi possível consultar evento existente.");
      }

      // Salva o evento e conclui o agendamento.
      const concluir = await fetch(
        `${supabaseUrl}/rest/v1/agendamentos_pagamentos?order_nsu=eq.${encodeURIComponent(orderNsu)}&status=eq.pago&evento_google_id=is.null`,
        {
          method: "PATCH",
          headers: {
            ...headers,
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            status: "agendado",
            evento_google_id: eventData.id,
            transaction_nsu: transactionNsu,
            atualizado_em: new Date().toISOString(),
          }),
        }
      );

      if (!concluir.ok) {
        throw new Error("Evento criado, mas não foi possível concluir no banco.");
      }

      const concluidos = await concluir.json();

      if (!concluidos.length) {
        const confirmar = await fetch(
          `${supabaseUrl}/rest/v1/agendamentos_pagamentos?order_nsu=eq.${encodeURIComponent(orderNsu)}&select=status,evento_google_id`,
          {
            headers,
            cache: "no-store",
          }
        );

        const estado = (await confirmar.json())[0];

        if (
          estado?.status !== "agendado" ||
          estado?.evento_google_id !== eventData.id
        ) {
          throw new Error("Não foi possível confirmar o agendamento.");
        }
      }

      return NextResponse.json({
        recebido: true,
        pagamento_confirmado: true,
        agendamento_confirmado: true,
      });
    } catch (error) {
      // Libera o processamento para permitir uma nova tentativa.
      await fetch(
        `${supabaseUrl}/rest/v1/agendamentos_pagamentos?order_nsu=eq.${encodeURIComponent(orderNsu)}&status=eq.pago`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            processamento_em: null,
            atualizado_em: new Date().toISOString(),
          }),
        }
      ).catch(() => null);

      throw error;
    }
  } catch (error) {
    console.error("Erro no webhook de pagamento:", orderNsu, error);

    return NextResponse.json(
      { erro: "Não foi possível concluir o processamento do pagamento." },
      { status: 500 }
    );
  }
}
