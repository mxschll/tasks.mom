export type VTODO = {
    uid: string;
    summary: string;
    description?: string;
    startDate?: Date;
    dueDate?: Date;
    completedDate?: Date;
    recurrence?: string;
    status: "NEEDS-ACTION" | "COMPLETED" | "IN-PROCESS" | "CANCELLED";
    priority?: number;
    percentComplete?: number;
    created?: Date;
    lastModified?: Date;
    sequence?: number;
    categories?: string[];
    location?: string;
    url?: string;
};

// Helper function to ensure dates are Date objects after JSON serialization
export function ensureDatesAreObjects(todo: VTODO): VTODO {
    const ensureDate = (dateValue: Date | string | undefined): Date | undefined => {
        if (!dateValue) return undefined;
        if (dateValue instanceof Date) return dateValue;
        if (typeof dateValue === 'string') return new Date(dateValue);
        return undefined;
    };

    return {
        ...todo,
        startDate: ensureDate(todo.startDate),
        dueDate: ensureDate(todo.dueDate),
        completedDate: ensureDate(todo.completedDate),
        created: ensureDate(todo.created),
        lastModified: ensureDate(todo.lastModified),
    };
}

export function parseVTODO(data: string): VTODO {
    const todo: VTODO = {
        uid: "",
        summary: "",
        status: "NEEDS-ACTION",
    };

    // Unfold lines (handle line continuations)
    const unfoldedData = data.replace(/\r\n[ \t]/g, "");
    const lines = unfoldedData.split("\r\n");

    let inTodo = false;

    for (const line of lines) {
        if (line === "BEGIN:VTODO") {
            inTodo = true;
            continue;
        }

        if (line === "END:VTODO") {
            break;
        }

        if (!inTodo || !line.includes(":")) {
            continue;
        }

        const colonIndex = line.indexOf(":");
        const propertyPart = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);

        // Parse property name and parameters
        const [propertyName, ...paramParts] = propertyPart.split(";");
        const parameters = parseParameters(paramParts);

        switch (propertyName) {
            case "SUMMARY":
                todo.summary = unescapeText(value);
                break;
            case "DESCRIPTION":
                todo.description = unescapeText(value);
                break;
            case "UID":
                todo.uid = value;
                break;
            case "DTSTART":
                todo.startDate = parseDateTime(value, parameters);
                break;
            case "DUE":
                todo.dueDate = parseDateTime(value, parameters);
                break;
            case "COMPLETED":
                todo.completedDate = parseDateTime(value, parameters);
                break;
            case "RRULE":
                todo.recurrence = value;
                break;
            case "STATUS":
                if (isValidStatus(value)) {
                    todo.status = value;
                }
                break;
            case "PRIORITY":
                const priority = parseInt(value, 10);
                if (!isNaN(priority) && priority >= 0 && priority <= 9) {
                    todo.priority = priority;
                }
                break;
            case "PERCENT-COMPLETE":
                const percent = parseInt(value, 10);
                if (!isNaN(percent) && percent >= 0 && percent <= 100) {
                    todo.percentComplete = percent;
                }
                break;
            case "CREATED":
                todo.created = parseDateTime(value, parameters);
                break;
            case "LAST-MODIFIED":
                todo.lastModified = parseDateTime(value, parameters);
                break;
            case "SEQUENCE":
                const sequence = parseInt(value, 10);
                if (!isNaN(sequence)) {
                    todo.sequence = sequence;
                }
                break;
            case "CATEGORIES":
                todo.categories = value.split(",").map((cat) => unescapeText(cat.trim()));
                break;
            case "LOCATION":
                todo.location = unescapeText(value);
                break;
            case "URL":
                todo.url = value;
                break;
        }
    }

    return todo;
}

function parseParameters(paramParts: string[]): Record<string, string> {
    const parameters: Record<string, string> = {};

    for (const part of paramParts) {
        const equalIndex = part.indexOf("=");
        if (equalIndex > 0) {
            const paramName = part.substring(0, equalIndex);
            const paramValue = part.substring(equalIndex + 1);
            parameters[paramName] = paramValue;
        }
    }

    return parameters;
}

function parseDateTime(value: string, parameters: Record<string, string>): Date | undefined {
    try {
        // Handle DATE-only values (YYYYMMDD)
        if (parameters.VALUE === "DATE") {
            if (value.length === 8) {
                const year = parseInt(value.substring(0, 4), 10);
                const month = parseInt(value.substring(4, 6), 10) - 1; // Month is 0-indexed
                const day = parseInt(value.substring(6, 8), 10);
                return new Date(year, month, day);
            }
        }

        // Handle DATE-TIME values (YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ)
        if (value.length >= 15) {
            const year = parseInt(value.substring(0, 4), 10);
            const month = parseInt(value.substring(4, 6), 10) - 1;
            const day = parseInt(value.substring(6, 8), 10);
            const hour = parseInt(value.substring(9, 11), 10);
            const minute = parseInt(value.substring(11, 13), 10);
            const second = parseInt(value.substring(13, 15), 10);

            // Check if it's UTC (ends with Z)
            if (value.endsWith("Z")) {
                return new Date(Date.UTC(year, month, day, hour, minute, second));
            } else {
                return new Date(year, month, day, hour, minute, second);
            }
        }
    } catch (error) {
        console.warn(`Failed to parse date: ${value}`, error);
    }

    return undefined;
}

function unescapeText(text: string): string {
    return text
        .replace(/\\n/g, "\n")
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";")
        .replace(/\\\\/g, "\\");
}

function isValidStatus(status: string): status is VTODO["status"] {
    return ["NEEDS-ACTION", "COMPLETED", "IN-PROCESS", "CANCELLED"].includes(status);
}
