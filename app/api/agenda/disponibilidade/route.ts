import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date");
    const duration = Number(
      request.nextUrl.searchParams.get("duration") || 60
    );

    if (
      !date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      ![60, 110].includes(duration)
    ) {
      return NextResponse.json(
        { erro: "Data ou duração inválida." },
        { status: 400 }
      );
    }

    const [year, month, day] = date.split("-").map(Number);
    const validDate = new Date(Date.UTC(year, month - 1, day));

    if (
      validDate.getUTCFullYear() !== year ||
      validDate.getUTCMonth() !== month - 1 ||
      validDate.getUTCDate() !== day
    ) {
      return NextResponse.json(
        { erro: "Data inválida." },
        { status: 400 }
      );
    }

    const weekday = validDate.getUTCDay();

    if (weekday === 0 || weekday === 1) {
      return NextResponse.json({ date, available: [] });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Configuração do banco incompleta.");
    }

    // Consulta os horários temporariamente reservados ou já pagos.
    const dbUrl = new URL(
      `${supabaseUrl}/rest/v1/agendamentos_pagamentos`
    );

    dbUrl.searchParams.set("select", "horario,duracao,status,expira_em");
    dbUrl.searchParams.set("data_agendamento", `eq.${date}`);
    dbUrl.searchParams.set(
      "or",
      `(status.eq.pago,status.eq.agendado,and(status.eq.pendente,expira_em.gt.${new Date().toISOString()}))`
    );

    const reservationsResponse = await fetch(dbUrl.toString(), {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: "no-store",
    });

    if (!reservationsResponse.ok) {
      throw new Error("Não foi possível consultar as reservas.");
    }

    const reservations = await reservationsResponse.json();

    // Consulta a conexão da agenda da Monique.
    const tokenResponseDb = await fetch(
      `${supabaseUrl}/rest/v1/google_calendar_tokens?id=eq.monique&select=refresh_token`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: "no-store",
      }
    );

    if (!tokenResponseDb.ok) {
      throw new Error("Não foi possível consultar a conexão do Google.");
    }

    const tokenRows = await tokenResponseDb.json();
    const refreshToken = tokenRows[0]?.refresh_token;

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

    const start = `${date}T00:00:00-03:00`;
    const end = `${date}T23:59:59-03:00`;

    const busyResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: start,
          timeMax: end,
          timeZone: "America/Sao_Paulo",
          items: [{ id: "primary" }],
        }),
        cache: "no-store",
      }
    );

    const busyData = await busyResponse.json();

    if (!busyResponse.ok) {
      throw new Error("O Google não conseguiu consultar os horários.");
    }

    const busy = busyData.calendars?.primary?.busy || [];

    const available: string[] = [];

    for (
      let minutes = 8 * 60;
      minutes + duration <= 20 * 60;
      minutes += 30
    ) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;

      const slotStart = new Date(
        `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`
      );

      const slotEnd = new Date(
        slotStart.getTime() + duration * 60 * 1000
      );

      const googleConflict = busy.some(
        (period: { start: string; end: string }) => {
          const busyStart = new Date(period.start);
          const busyEnd = new Date(period.end);

          return slotStart < busyEnd && slotEnd > busyStart;
        }
      );

      const databaseConflict = reservations.some(
        (reservation: {
          horario: string;
          duracao: number;
        }) => {
          const [reservedHour, reservedMinute] =
            reservation.horario.split(":").map(Number);

          const reservationStart = new Date(
            `${date}T${String(reservedHour).padStart(2, "0")}:${String(reservedMinute).padStart(2, "0")}:00-03:00`
          );

          const reservationEnd = new Date(
            reservationStart.getTime() +
              reservation.duracao * 60 * 1000
          );

          return (
            slotStart < reservationEnd &&
            slotEnd > reservationStart
          );
        }
      );

      if (
        !googleConflict &&
        !databaseConflict &&
        slotStart.getTime() > Date.now()
      ) {
        available.push(
          `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
        );
      }
    }

    return NextResponse.json({ date, available });
  } catch (error) {
    console.error("Erro na consulta da agenda:", error);

    return NextResponse.json(
      { erro: "Não foi possível consultar a agenda." },
      { status: 500 }
    );
  }
}
