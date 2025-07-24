import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { getClient, fetchCalendars } from "@/lib/caldav";

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session?.endpoint || !session?.username || !session?.password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { taskUid, calendarUrl } = body;

    if (!taskUid || !calendarUrl) {
      return NextResponse.json({ error: "Task UID and calendar URL are required" }, { status: 400 });
    }

    const client = await getClient(
      session.endpoint,
      session.username,
      session.password
    );

    // Find the target calendar
    const calendars = await fetchCalendars(client);
    const targetCalendar = calendars.find(cal => cal.url === calendarUrl);
    
    if (!targetCalendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 400 });
    }

    // Fetch all VTODO objects with the same filters used in fetchTasks
    const calendarObjects = await client.fetchCalendarObjects({
      calendar: targetCalendar,
      filters: [
        {
          "comp-filter": {
            _attributes: {
              name: "VCALENDAR",
            },
            "comp-filter": {
              _attributes: {
                name: "VTODO",
              },
              "prop-filter": {
                _attributes: {
                  name: "STATUS",
                },
              },
            },
          },
        },
      ]
    });

    const taskObject = calendarObjects.find(obj => obj.data.includes(`UID:${taskUid}`));
    
    if (!taskObject) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete the calendar object
    await client.deleteCalendarObject({
      calendarObject: taskObject,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json(
      { error: "Failed to delete task", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 