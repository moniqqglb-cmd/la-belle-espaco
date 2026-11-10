export async function POST(request: Request) {
  try {
    const token = process.env.RECUPERACAO_TOKEN;
    const authorization = request.headers.get("authorization");

    if (!token) {
      return Response.json(
        { error: "Configuração de segurança ausente." },
        { status: 500 }
      );
    }

    if (authorization !== `Bearer ${token}`) {
      return Response.json(
        { error: "Não autorizado." },
        { status: 401 }
      );
    }

    const apiKey = process.env.INFINITEPAY_API_KEY;
    const handle = process.env.INFINITEPAY_HANDLE;

    if (!apiKey || !handle) {
      return Response.json(
        { error: "Configuração InfinitePay ausente." },
        { status: 500 }
      );
    }

    const resposta = await fetch(
      "https://api.infinitepay.io/invoices/public/checkout/payment_check",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({
          handle,
          order_nsu: "83ad976c-5c6f-4087-9054-1ebbeea30688",
          transaction_nsu: "9bface42-a785-4d4f-91fe-413ffd364040",
          slug: "AXKBMxymlF",
        }),
      }
    );

    const resultado = await resposta.json();

    if (!resposta.ok) {
      return Response.json(
        { error: "A InfinitePay não confirmou a consulta." },
        { status: 502 }
      );
    }

    return Response.json({
      success: resultado.success,
      paid: resultado.paid,
      amount: resultado.amount,
      paid_amount: resultado.paid_amount,
      capture_method: resultado.capture_method,
    });
  } catch {
    return Response.json(
      { error: "Erro ao consultar o pagamento." },
      { status: 500 }
    );
  }
}
