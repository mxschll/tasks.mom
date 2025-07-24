import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { fetchCalendars, getClient } from "@/lib/caldav";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session?.endpoint || !session?.username || !session?.password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await getClient(
      session.endpoint,
      session.username,
      session.password
    );

    const calendars = await fetchCalendars(client);

    return NextResponse.json({ calendars });
  } catch (error) {
    console.error("Failed to fetch calendars:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendars" },
      { status: 500 }
    );
  }
} 