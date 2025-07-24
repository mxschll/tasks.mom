import { NextRequest, NextResponse } from "next/server";
import { sessionOptions, SessionData } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getClient } from "@/lib/caldav";

export async function POST(request: NextRequest) {
    try {
        const { endpoint, username, password } = await request.json();

        // Validate required fields
        if (!endpoint || !username || !password) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        // Test the CalDAV connection
        try {
            const client = await getClient(endpoint, username, password);
            // Try to fetch calendars to verify the connection works
            await client.fetchCalendars();
        } catch (error) {
            console.error("CalDAV connection failed:", error);
            return NextResponse.json(
                { error: "Failed to connect to CalDAV server. Please check your URL and credentials." },
                { status: 401 }
            );
        }

        // Connection successful, save to session
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

        session.endpoint = endpoint;
        session.username = username;
        session.password = password;

        await session.save();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred. Please try again." },
            { status: 500 }
        );
    }
}
