import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const SERVICOS: Record<string, { preco: number; duracao: number }> = {
  "Drenagem linfática": { preco: 11999, duracao: 60 },
  "Massagem modeladora": { preco: 13999, duracao: 60 },
  "Secagem de vasinhos": { preco: 8999, duracao: 60 },
  "Corrente russa": { preco: 3999, duracao: 60 },
  "Carboxiterapia": { preco: 39999, duracao: 60 },
  "Limpeza de pele": { preco: 14999, duracao: 110 },
  "Preenchimento labial": { preco: 89999, duracao: 60 },
  "Botox": { preco: 89999, duracao: 60 },
  "Bigode chinês": { preco: 89999, duracao: 60 },
  "Rinomodelação": { preco: 89999, duracao: 60 },
  "Preenchimento de olheiras": { preco: 89999, duracao: 60 },
  "Preenchimento mandíbula": { preco: 89999, duracao: 60 },
  "Preenchimento mento": { preco: 89999, duracao: 60 },
  "Bioestimulador de colágeno": { preco: 150000, duracao: 60 },
  "Peeling químico": { preco: 18000, duracao: 60 },
  "Peeling de diamante": { preco: 4999, duracao: 60 },
  "Skinbooster": { preco: 35000, duracao: 60 },
};

export async function POST(request: NextRequest) {
  let supabaseUrl = "";
  let supabaseKey = "";
  let orderNsu = "";

  try {
    const body = await request.json();

    const nome = String(body.nome || "").trim();
    const telefone = String(body.telefone || "").trim();
    const servico = String(body.servico || "").trim();
    const profissional = String(body.profissional || "").trim();
    const data = String(body.data || "").trim();
    const horario = String(body.horario || "").trim();

    if (
      nome.length < 2 ||
      nome.length > 100 ||
      telefone.length < 8 ||
      telefone.length > 30 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)
    ) {
      return NextResponse.json(
        { erro: "Confira os dados do agendamento." },
        { status: 400 }
      );
    }

    const item = SERVICOS[servico];

    if (!item) {
      return NextResponse.json(
        { erro: "Serviço sem preço cadastrado." },
        { status: 400 }
      );
    }

    if (!["Dra. Monique Gomes", "Beatriz"].includes(profissional)) {
      return NextResponse.json(
        { erro: "Profissional inválida." },
        { status: 400 }
      );
    }

    if (
      profissional === "Beatriz" &&
      !["Drenagem linfática", "Massagem modeladora"].includes(servico)
    ) {
      return NextResponse.json(
        { erro: "Serviço indisponível com essa profissional." },
        { status: 400 }
      );
    }

    const [ano, mes, dia] = data.split("-").map(Number);
    const dataValida = new Date(Date.UTC(ano, mes - 1, dia));

    if (
      dataValida.getUTCFullYear() !== ano ||
      dataValida.getUTCMonth() !== mes - 1 ||
      dataValida.getUTCDate() !== dia
    ) {
      return NextResponse.json(
        { erro: "Data inválida." },
        { status: 400 }
      );
    }

    const diaSemana = dataValida.getUTCDay();
    const [hora, minuto] = horario.split(":").map(Number);
    const inicioMinutos = hora * 60 + minuto;
    const fimMinutos = inicioMinutos + item.duracao;

    if (
      diaSemana === 0 ||
      diaSemana === 1 ||
      inicioMinutos < 480 ||
      fimMinutos > 1200 ||
      inicioMinutos % 30 !== 0
    ) {
      return NextResponse.json(
        { erro: "Data ou horário fora do funcionamento." },
        { status: 400 }
      );
    }

    if (
      profissional === "Beatriz" &&
      !(
        (diaSemana >= 2 && diaSemana <= 5 && inicioMinutos >= 780) ||
        (diaSemana === 6 && inicioMinutos >= 480)
      )
    ) {
      return NextResponse.json(
        { erro: "Horário indisponível para Beatriz." },
        { status: 400 }
      );
    }

    const inicio = new Date(`${data}T${horario}:00-03:00`);

    if (inicio.getTime() <= Date.now()) {
      return NextResponse.json(
        { erro: "Escolha um horário futuro." },
        { status: 400 }
      );
    }

    supabaseUrl = process.env.SUPABASE_URL || "";
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const infinitePayKey = process.env.INFINITEPAY_API_KEY || "";

    if (!supabaseUrl || !supabaseKey || !infinitePayKey) {
      throw new Error("Configuração do servidor incompleta.");
    }

    orderNsu = `LB-${randomUUID()}`;
    const sinal = Math.round(item.preco * 0.2);

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    };

    // Reserva o horário por 15 minutos no banco.
    const reserva = await fetch(
      `${supabaseUrl}/rest/v1/rpc/criar_reserva_pendente`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          p_order_nsu: orderNsu,
          p_cliente_nome: nome,
          p_cliente_telefone: telefone,
          p_servico: servico,
          p_profissional: profissional,
          p_data: data,
          p_horario: horario,
          p_duracao: item.duracao,
          p_valor_total: item.preco,
          p_sinal: sinal,
        }),
        cache: "no-store",
      }
    );

    const resultadoReserva = await reserva.json();

    if (!reserva.ok) {
      throw new Error("Não foi possível reservar o horário.");
    }

    if (resultadoReserva.sucesso !== true) {
      return NextResponse.json(
        { erro: resultadoReserva.erro || "Esse horário não está disponível." },
        { status: 409 }
      );
    }

    // Cria a cobrança na InfinitePay.
    const checkout = await fetch(
      "https://api.checkout.infinitepay.io/links",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": infinitePayKey,
        },
        body: JSON.stringify({
          order_nsu: orderNsu,
          redirect_url: "https://la-belle-espaco-uz8o.vercel.app",
          webhook: {
            url: "https://la-belle-espaco-uz8o.vercel.app/api/pagamento/webhook",
            events: ["paid", "refunded", "canceled"],
          },
          items: [
            {
              quantity: 1,
              price: sinal,
              description: `Sinal de 20% - ${servico}`,
            },
          ],
          customer: {
            name: nome,
            phone_number: telefone,
          },
          options: {
            assured_installments: 10,
            valid_until: new Date(
              Date.now() + 15 * 60 * 1000
            ).toISOString(),
          },
        }),
      }
    );

    const resultado = await checkout.json();

    const link =
      resultado.url ||
      resultado.checkout_url ||
      resultado.link;

    if (!checkout.ok || !link) {
      throw new Error("A InfinitePay não conseguiu gerar a cobrança.");
    }

    return NextResponse.json({
      sucesso: true,
      order_nsu: orderNsu,
      link_pagamento: link,
      valor_sinal: sinal,
      valor_restante: item.preco - sinal,
    });
  } catch (error) {
    console.error("Erro ao criar cobrança:", error);

    // Se a cobrança falhar, libera a reserva.
    if (orderNsu && supabaseUrl && supabaseKey) {
      await fetch(
        `${supabaseUrl}/rest/v1/agendamentos_pagamentos?order_nsu=eq.${encodeURIComponent(orderNsu)}&status=eq.pendente`,
        {
          method: "PATCH",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "cancelado",
            atualizado_em: new Date().toISOString(),
          }),
        }
      ).catch(() => null);
    }

    return NextResponse.json(
      { erro: "Não foi possível iniciar o pagamento. Tente novamente." },
      { status: 500 }
    );
  }
}
