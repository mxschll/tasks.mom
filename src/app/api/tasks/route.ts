import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { createTask, getClient, fetchCalendars } from "@/lib/caldav";
import { ensureDatesAreObjects } from "@/lib/vtodo";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session?.endpoint || !session?.username || !session?.password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { summary, description, dueDate, priority, recurrence, calendarUrl } = body;

    if (!summary || typeof summary !== 'string') {
      return NextResponse.json({ error: "Summary is required" }, { status: 400 });
    }

    const client = await getClient(
      session.endpoint,
      session.username,
      session.password
    );

    // Find the target calendar
    let targetCalendar;
    if (calendarUrl) {
      const calendars = await fetchCalendars(client);
      targetCalendar = calendars.find(cal => cal.url === calendarUrl);
      if (!targetCalendar) {
        return NextResponse.json({ error: "Calendar not found" }, { status: 400 });
      }
    }

    // Convert dueDate string back to Date if provided
    const dueDateObj = dueDate ? new Date(dueDate) : undefined;

    const createdTask = await createTask(client, {
      summary: summary.trim(),
      description: description?.trim() || undefined,
      dueDate: dueDateObj,
      priority,
      recurrence,
    }, targetCalendar);

    // Ensure dates are proper Date objects before sending response
    const taskWithDates = ensureDatesAreObjects(createdTask);

    return NextResponse.json({ success: true, task: taskWithDates });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
} 