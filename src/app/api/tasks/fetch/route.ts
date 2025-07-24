import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { fetchTasksForCalendarUrl, getClient } from "@/lib/caldav";
import { ensureDatesAreObjects } from "@/lib/vtodo";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session?.endpoint || !session?.username || !session?.password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const calendarUrl = searchParams.get('calendarUrl');

    if (!calendarUrl) {
      return NextResponse.json({ error: "Calendar URL is required" }, { status: 400 });
    }

    const client = await getClient(
      session.endpoint,
      session.username,
      session.password
    );

    const tasks = await fetchTasksForCalendarUrl(client, calendarUrl);
    
    // Ensure dates are properly converted back to Date objects
    const tasksWithDates = tasks.map(ensureDatesAreObjects);

    return NextResponse.json({ tasks: tasksWithDates });
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
} 