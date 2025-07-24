import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { getClient, fetchCalendars } from "@/lib/caldav";

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session?.endpoint || !session?.username || !session?.password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { taskUid, status, calendarUrl } = body;

    if (!taskUid || !status || !calendarUrl) {
      return NextResponse.json({ error: "Task UID, status, and calendar URL are required" }, { status: 400 });
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

    // More robust task finding - try multiple approaches
    let taskObject = null;
    
    // Approach 1: Direct UID match
    taskObject = calendarObjects.find(obj => obj.data.includes(`UID:${taskUid}`));
    
    if (!taskObject) {
      // Approach 2: UID match with different line endings
      taskObject = calendarObjects.find(obj => 
        obj.data.includes(`UID:${taskUid}\r\n`) || 
        obj.data.includes(`UID:${taskUid}\n`)
      );
    }
    
    if (!taskObject) {
      // Approach 3: Check if the UID is in the object's URL
      taskObject = calendarObjects.find(obj => 
        obj.url?.includes(taskUid)
      );
    }

    if (!taskObject) {
      return NextResponse.json({ 
        error: "Task not found", 
        debug: {
          searchingFor: taskUid,
          totalObjects: calendarObjects.length,
          availableUids: calendarObjects.map(obj => {
            const uidMatch = obj.data.match(/UID:([^\r\n]+)/);
            return uidMatch ? uidMatch[1] : 'NO_UID';
          })
        }
      }, { status: 404 });
    }

    // Update the task status in the VTODO data
    let updatedVTODO = taskObject.data;
    const now = new Date();
    const formattedNow = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Update status
    if (updatedVTODO.includes('STATUS:')) {
      updatedVTODO = updatedVTODO.replace(/STATUS:.*\r?\n/, `STATUS:${status}\r\n`);
    } else {
      // Add status line after UID
      updatedVTODO = updatedVTODO.replace(
        /UID:.*\r?\n/,
        `$&STATUS:${status}\r\n`
      );
    }

    // Update LAST-MODIFIED
    if (updatedVTODO.includes('LAST-MODIFIED:')) {
      updatedVTODO = updatedVTODO.replace(/LAST-MODIFIED:.*\r?\n/, `LAST-MODIFIED:${formattedNow}\r\n`);
    } else {
      // Add LAST-MODIFIED after DTSTAMP
      updatedVTODO = updatedVTODO.replace(
        /DTSTAMP:.*\r?\n/,
        `$&LAST-MODIFIED:${formattedNow}\r\n`
      );
    }

    // Add COMPLETED timestamp if marking as completed
    if (status === 'COMPLETED') {
      if (updatedVTODO.includes('COMPLETED:')) {
        updatedVTODO = updatedVTODO.replace(/COMPLETED:.*\r?\n/, `COMPLETED:${formattedNow}\r\n`);
      } else {
        // Add COMPLETED after STATUS
        updatedVTODO = updatedVTODO.replace(
          /STATUS:.*\r?\n/,
          `$&COMPLETED:${formattedNow}\r\n`
        );
      }
    } else {
      // Remove COMPLETED line if marking as incomplete
      updatedVTODO = updatedVTODO.replace(/COMPLETED:.*\r?\n/, '');
    }

    // Update the calendar object
    await client.updateCalendarObject({
      calendarObject: {
        ...taskObject,
        data: updatedVTODO,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json(
      { error: "Failed to update task", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 