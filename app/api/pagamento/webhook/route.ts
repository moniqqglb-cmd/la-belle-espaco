import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const orderNsu = String(body.order_nsu || "");
    const transactionNsu = String(body.transaction_nsu || "");
    const slug = String(body.invoice_slug || "");

    if (!orderNsu || !transactionNsu || !slug) {
      return NextResponse.json(
        { erro: "Identificadores do pagamento incompletos." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const infinitePayKey = process.env.INFINITEPAY_API_KEY;
    const infinitePayHandle = process.env.INFINITEPAY_HANDLE;

    if (!supabaseUrl || !supabaseKey || !infinitePayKey || !infinitePayHandle) {
      return NextResponse.json(
        { erro: "Configuração do servidor incompleta." },
        { status: 500 }
      );
    }

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    };

    const consulta = await fetch(
      `${supabaseUrl}/rest/v1/agendamentos_pagamentos?order_nsu=eq.${encodeURIComponent(orderNsu)}&select=*`,
      { headers }
    );

    if (!consulta.ok) {
      return NextResponse.json(
        { erro: "Falha ao consultar o pedido." },
        { status: 500 }
      );
    }

    const pedidos = await consulta.json();
    const pedido = pedidos[0];

    if (!pedido) {
      return NextResponse.json(
        { erro: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (pedido.status !== "pendente") {
      return NextResponse.json({ recebido: true });
    }

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
      }
    );

    if (!verificacao.ok) {
      return NextResponse.json(
        { erro: "Falha na verificação da InfinitePay." },
        { status: 502 }
      );
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

    const atualizacao = await fetch(
      `${supabaseUrl}/rest/v1/agendamentos_pagamentos?order_nsu=eq.${encodeURIComponent(orderNsu)}&status=eq.pendente`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          status: "pago",
          transaction_nsu: transactionNsu,
          atualizado_em: new Date().toISOString(),
        }),
      }
    );

    if (!atualizacao.ok) {
      return NextResponse.json(
        { erro: "Falha ao atualizar o pedido." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      recebido: true,
      pagamento_confirmado: true,
    });
  } catch {
    return NextResponse.json(
      { erro: "Erro interno ao processar o pagamento." },
      { status: 500 }
    );
  }
}
