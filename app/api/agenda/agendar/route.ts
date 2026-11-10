import { NextResponse } from “next/server”;

export const dynamic = “force-dynamic”;

export async function POST() {
return NextResponse.json(
{
erro: “Agendamentos devem ser realizados pelo fluxo de pagamento.”
},
{ status: 410 }
);
}
