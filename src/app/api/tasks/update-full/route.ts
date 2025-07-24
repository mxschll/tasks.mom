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
    const { taskUid, summary, description, dueDate, priority, recurrence, calendarUrl } = body;

    if (!taskUid || !summary || !calendarUrl) {
      return NextResponse.json({ error: "Task UID, summary, and calendar URL are required" }, { status: 400 });
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

    // Update the task in the VTODO data
    let updatedVTODO = taskObject.data;
    const now = new Date();
    const formattedNow = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Update SUMMARY
    if (updatedVTODO.includes('SUMMARY:')) {
      updatedVTODO = updatedVTODO.replace(/SUMMARY:.*\r?\n/, `SUMMARY:${summary.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')}\r\n`);
    }

    // Update DESCRIPTION
    if (description) {
      if (updatedVTODO.includes('DESCRIPTION:')) {
        updatedVTODO = updatedVTODO.replace(/DESCRIPTION:.*\r?\n/, `DESCRIPTION:${description.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')}\r\n`);
      } else {
        // Add DESCRIPTION after SUMMARY
        updatedVTODO = updatedVTODO.replace(
          /SUMMARY:.*\r?\n/,
          `$&DESCRIPTION:${description.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')}\r\n`
        );
      }
    } else {
      // Remove DESCRIPTION if empty
      updatedVTODO = updatedVTODO.replace(/DESCRIPTION:.*\r?\n/, '');
    }

    // Update DUE date
    if (dueDate) {
      const date = new Date(dueDate);
      const formatDateOnly = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
      };

      if (updatedVTODO.includes('DUE:')) {
        updatedVTODO = updatedVTODO.replace(/DUE.*\r?\n/, `DUE;VALUE=DATE:${formatDateOnly(date)}\r\n`);
      } else {
        // Add DUE after DESCRIPTION or SUMMARY
        const insertAfter = updatedVTODO.includes('DESCRIPTION:') ? /DESCRIPTION:.*\r?\n/ : /SUMMARY:.*\r?\n/;
        updatedVTODO = updatedVTODO.replace(
          insertAfter,
          `$&DUE;VALUE=DATE:${formatDateOnly(date)}\r\n`
        );
      }
    } else {
      // Remove DUE if no date
      updatedVTODO = updatedVTODO.replace(/DUE.*\r?\n/, '');
    }

    // Update PRIORITY
    let priorityValue = '';
    switch (priority) {
      case 'high': priorityValue = '1'; break;
      case 'medium': priorityValue = '5'; break;
      case 'low': priorityValue = '9'; break;
      default: priorityValue = '0'; break;
    }

    if (priorityValue !== '0') {
      if (updatedVTODO.includes('PRIORITY:')) {
        updatedVTODO = updatedVTODO.replace(/PRIORITY:.*\r?\n/, `PRIORITY:${priorityValue}\r\n`);
      } else {
        // Add PRIORITY after DUE or DESCRIPTION or SUMMARY
        const insertAfter = updatedVTODO.includes('DUE:') ? /DUE.*\r?\n/ : 
                           updatedVTODO.includes('DESCRIPTION:') ? /DESCRIPTION:.*\r?\n/ : 
                           /SUMMARY:.*\r?\n/;
        updatedVTODO = updatedVTODO.replace(
          insertAfter,
          `$&PRIORITY:${priorityValue}\r\n`
        );
      }
    } else {
      // Remove PRIORITY if none
      updatedVTODO = updatedVTODO.replace(/PRIORITY:.*\r?\n/, '');
    }

    // Update RRULE (recurrence)
    let rrule = '';
    switch (recurrence) {
      case 'daily': rrule = 'RRULE:FREQ=DAILY'; break;
      case 'weekly': rrule = 'RRULE:FREQ=WEEKLY'; break;
      case 'monthly': rrule = 'RRULE:FREQ=MONTHLY'; break;
      case 'yearly': rrule = 'RRULE:FREQ=YEARLY'; break;
      default: rrule = ''; break;
    }

    if (rrule) {
      if (updatedVTODO.includes('RRULE:')) {
        updatedVTODO = updatedVTODO.replace(/RRULE:.*\r?\n/, `${rrule}\r\n`);
      } else {
        // Add RRULE before END:VTODO
        updatedVTODO = updatedVTODO.replace(
          /END:VTODO/,
          `${rrule}\r\nEND:VTODO`
        );
      }
    } else {
      // Remove RRULE if never
      updatedVTODO = updatedVTODO.replace(/RRULE:.*\r?\n/, '');
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