import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

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
  try {
    const body = await request.json();

    const nome = String(body.nome || "").trim();
    const telefone = String(body.telefone || "").trim();
    const servico = String(body.servico || "").trim();
    const profissional = String(body.profissional || "").trim();
    const data = String(body.data || "").trim();
    const horario = String(body.horario || "").trim();

    if (!nome || !telefone || !servico || !profissional || !data || !horario) {
      return NextResponse.json(
        { erro: "Preencha todos os dados do agendamento." },
        { status: 400 }
      );
    }

    const item = SERVICOS[servico];

    if (!item) {
      return NextResponse.json(
        { erro: "Serviço não encontrado ou sem preço cadastrado." },
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
        { erro: "Esse serviço não está disponível com essa profissional." },
        { status: 400 }
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)
    ) {
      return NextResponse.json(
        { erro: "Data ou horário inválido." },
        { status: 400 }
      );
    }

    const sinal = Math.round(item.preco * 0.20);
    const orderNsu = `LB-${randomUUID()}`;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const infinitePayKey = process.env.INFINITEPAY_API_KEY;

    if (!supabaseUrl || !supabaseKey || !infinitePayKey) {
      return NextResponse.json(
        { erro: "Configuração do servidor incompleta." },
        { status: 500 }
      );
    }

    const registro = await fetch(
      `${supabaseUrl}/rest/v1/agendamentos_pagamentos`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          order_nsu: orderNsu,
          cliente_nome: nome,
          cliente_telefone: telefone,
          servico,
          profissional,
          data_agendamento: data,
          horario,
          duracao: item.duracao,
          valor_total_centavos: item.preco,
          sinal_centavos: sinal,
          status: "pendente",
        }),
      }
    );

    if (!registro.ok) {
      return NextResponse.json(
        { erro: "Não foi possível registrar o pedido." },
        { status: 500 }
      );
    }

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
              Date.now() + 24 * 60 * 60 * 1000
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
      return NextResponse.json(
        { erro: "A InfinitePay não conseguiu gerar a cobrança." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      order_nsu: orderNsu,
      link_pagamento: link,
      valor_sinal: sinal,
      valor_restante: item.preco - sinal,
    });
  } catch {
    return NextResponse.json(
      { erro: "Erro interno ao criar a cobrança." },
      { status: 500 }
    );
  }
}
