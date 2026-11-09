import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error || !code) {
      return NextResponse.json(
        { erro: "Autorização do Google não recebida." },
        { status: 400 }
      );
    }

    const redirectUri =
      "https://la-belle-espaco-uz8o.vercel.app/api/auth/google/callback";

    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }
    );

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { erro: "Falha ao obter autorização do Google.", detalhes: tokens },
        { status: 400 }
      );
    }

    if (!tokens.refresh_token) {
      return NextResponse.json(
        {
          erro: "O Google não forneceu um refresh token. Será necessário autorizar novamente.",
        },
        { status: 400 }
      );
    }

    const supabaseResponse = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/google_calendar_tokens`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          id: "monique",
          refresh_token: tokens.refresh_token,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!supabaseResponse.ok) {
      return NextResponse.json(
        { erro: "Não foi possível salvar a autorização no banco." },
        { status: 500 }
      );
    }

    return NextResponse.redirect(
      new URL("/?google=conectado", request.url)
    );
  } catch {
    return NextResponse.json(
      { erro: "Erro interno ao conectar o Google Agenda." },
      { status: 500 }
    );
  }
}
