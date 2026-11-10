import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!supabaseResponse.ok) {
  const detalhes = await supabaseResponse.text();

  return NextResponse.json(
    {
      erro: "Não foi possível salvar a autorização no banco.",
      status: supabaseResponse.status,
      detalhes,
    },
    { status: 500 }
  );
}

  const state = randomBytes(32).toString("hex");

  const redirectUri =
    "https://la-belle-espaco-uz8o.vercel.app/api/auth/google/callback";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope:
      "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );

  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/auth/google/callback",
    maxAge: 600,
  });

  return response;
}
