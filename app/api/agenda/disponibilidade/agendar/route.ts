import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { service, date, time, name, phone, duration } = body;

    if (
      typeof service !== "string" ||
      service.length < 2 ||
      service.length > 100 ||
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.length > 100 ||
      typeof phone !== "string" ||
      phone.length < 8 ||
      phone.length > 30 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || "") ||
      ![60, 110].includes(Number(duration))
    ) {
      return NextResponse.json(
        { erro: "Dados do agendamento inválidos." },
        { status: 400 }
      );
    }

    const [year, month, day] = date.split("-").map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

    if (weekday === 0 || weekday === 1) {
      return NextResponse.json(
        { erro: "A clínica não atende nesse dia." },
        { status: 400 }
      );
    }

    const [hour, minute] = time.split(":").map(Number);
    const startMinutes = hour * 60 + minute;
    const endMinutes = startMinutes + Number(duration);

    if (
      startMinutes < 480 ||
      endMinutes > 1200 ||
      startMinutes % 30 !== 0
    ) {
      return NextResponse.json(
        { erro: "Horário fora do funcionamento da clínica." },
        { status: 400 }
      );
    }

    const start = new Date(
      `${date}T${time}:00-03:00`
    );

    const end = new Date(
      start.getTime() + Number(duration) * 60 * 1000
    );

    if (start.getTime() <= Date.now()) {
      return NextResponse.json(
        { erro: "Escolha um horário futuro." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Configuração do banco incompleta.");
    }

    const dbResponse = await fetch(
      `${supabaseUrl}/rest/v1/google_calendar_tokens?id=eq.monique&select=refresh_token`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: "no-store",
      }
    );

    if (!dbResponse.ok) {
      throw new Error("Não foi possível consultar a conexão.");
    }

    const rows = await dbResponse.json();
    const refreshToken = rows[0]?.refresh_token;

    if (!refreshToken) {
      throw new Error("Agenda da Monique não está conectada.");
    }

    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
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

    const busyResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          timeZone: "America/Sao_Paulo",
          items: [{ id: "primary" }],
        }),
        cache: "no-store",
      }
    );

    const busyData = await busyResponse.json();

    if (!busyResponse.ok) {
      throw new Error("Não foi possível verificar a disponibilidade.");
    }

    const busy = busyData.calendars?.primary?.busy || [];

    const conflito = busy.some(
      (period: { start: string; end: string }) =>
        start < new Date(period.end) &&
        end > new Date(period.start)
    );

    if (conflito) {
      return NextResponse.json(
        { erro: "Esse horário acabou de ser ocupado. Escolha outro." },
        { status: 409 }
      );
    }

    const eventResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `${service} - ${name.trim()}`,
          description: [
            `Cliente: ${name.trim()}`,
            `Telefone: ${phone.trim()}`,
            `Procedimento: ${service}`,
            "Agendamento realizado pelo site La Belle Espaço.",
          ].join("\n"),
          start: {
            dateTime: start.toISOString(),
            timeZone: "America/Sao_Paulo",
          },
          end: {
            dateTime: end.toISOString(),
            timeZone: "America/Sao_Paulo",
          },
        }),
      }
    );

    const eventData = await eventResponse.json();

    if (!eventResponse.ok) {
      throw new Error("Não foi possível criar o compromisso.");
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: "Agendamento criado com sucesso!",
      evento: eventData.id,
    });
  } catch (error) {
    console.error("Erro ao agendar:", error);

    return NextResponse.json(
      { erro: "Não foi possível concluir o agendamento." },
      { status: 500 }
    );
  }
}
