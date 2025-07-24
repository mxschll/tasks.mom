import { DAVCalendar, DAVClient } from "tsdav";
import { parseVTODO, VTODO } from "./vtodo";

export async function fetchCalendars(client: DAVClient): Promise<DAVCalendar[]> {
    const calendars = await client.fetchCalendars();
    return calendars;
}

async function fetchTodos(client: DAVClient, calendar: DAVCalendar) {

    const todos = await client.fetchCalendarObjects({
        calendar,
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
                            // "text-match": {
                            //     _attributes: {
                            //         "negate-condition": "yes",
                            //     },
                            //     _text: "COMPLETED",
                            // },
                        },
                    },
                },
            },
        ]
    });

    return todos;
}

export async function fetchTasks(client: DAVClient, calendar?: DAVCalendar) {
    let targetCalendar = calendar;
    
    if (!targetCalendar) {
        const calendars = await fetchCalendars(client);
        targetCalendar = calendars[0]; // fallback to default calendar
    }

    const todos = await fetchTodos(client, targetCalendar);

    const response: VTODO[] = [];
    todos.forEach((todo) => {
        response.push(parseVTODO(todo.data));
    });

    return response;
}

export async function fetchTasksForCalendarUrl(client: DAVClient, calendarUrl: string) {
    const calendars = await fetchCalendars(client);
    const targetCalendar = calendars.find(cal => cal.url === calendarUrl);
    
    if (!targetCalendar) {
        throw new Error(`Calendar not found: ${calendarUrl}`);
    }

    return fetchTasks(client, targetCalendar);
}

export async function createTask(
    client: DAVClient, 
    task: {
        summary: string;
        description?: string;
        dueDate?: Date;
        priority?: 'none' | 'low' | 'medium' | 'high';
        recurrence?: 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    },
    calendar?: DAVCalendar
): Promise<VTODO> {
    let targetCalendar = calendar;
    
    if (!targetCalendar) {
        const calendars = await fetchCalendars(client);
        targetCalendar = calendars[1]; // fallback to default calendar
    }

    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    // Convert priority to iCalendar format (0=undefined, 1=high, 5=medium, 9=low)
    let priorityValue = '';
    switch (task.priority) {
        case 'high': priorityValue = '1'; break;
        case 'medium': priorityValue = '5'; break;
        case 'low': priorityValue = '9'; break;
        default: priorityValue = '0'; break;
    }

    // Convert recurrence to RRULE format
    let rrule = '';
    switch (task.recurrence) {
        case 'daily': rrule = 'RRULE:FREQ=DAILY'; break;
        case 'weekly': rrule = 'RRULE:FREQ=WEEKLY'; break;
        case 'monthly': rrule = 'RRULE:FREQ=MONTHLY'; break;
        case 'yearly': rrule = 'RRULE:FREQ=YEARLY'; break;
        default: rrule = ''; break;
    }

    // Format dates in iCalendar format
    const formatDate = (date: Date): string => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const formatDateOnly = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    let vtodoContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Tasks.mom//EN
BEGIN:VTODO
UID:${uid}
DTSTAMP:${formatDate(now)}
CREATED:${formatDate(now)}
LAST-MODIFIED:${formatDate(now)}
SUMMARY:${task.summary.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')}
STATUS:NEEDS-ACTION`;

    if (task.description) {
        vtodoContent += `\nDESCRIPTION:${task.description.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')}`;
    }

    if (task.dueDate) {
        vtodoContent += `\nDUE;VALUE=DATE:${formatDateOnly(task.dueDate)}`;
    }

    if (priorityValue !== '0') {
        vtodoContent += `\nPRIORITY:${priorityValue}`;
    }

    if (rrule) {
        vtodoContent += `\n${rrule}`;
    }

    vtodoContent += `\nEND:VTODO
END:VCALENDAR`;

    // Create the task on the server
    await client.createCalendarObject({
        calendar: targetCalendar,
        filename: `${uid}.ics`,
        iCalString: vtodoContent,
    });

    // Fetch the created task back from the server to get the real UID and any server modifications
    const todos = await client.fetchCalendarObjects({
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
                                name: "UID",
                            },
                            "text-match": {
                                _text: uid,
                            },
                        },
                    },
                },
            },
        ]
    });

    if (todos.length === 0) {
        throw new Error('Failed to retrieve created task from server');
    }

    // Parse and return the created task
    return parseVTODO(todos[0].data);
}

export async function getClient(
    endpoint: string,
    username: string,
    password: string
): Promise<DAVClient> {

    const client = new DAVClient({
        serverUrl: endpoint,
        credentials: {
            username,
            password
        },
        authMethod: "Basic",
        defaultAccountType: "caldav",
    });

    await client.login();

    return client;
}
