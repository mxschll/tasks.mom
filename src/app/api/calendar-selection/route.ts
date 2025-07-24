import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session?.endpoint || !session?.username || !session?.password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { calendarUrl } = body;

    if (!calendarUrl || typeof calendarUrl !== 'string') {
      return NextResponse.json({ error: "Calendar URL is required" }, { status: 400 });
    }

    // Save selected calendar to session
    session.selectedCalendarUrl = calendarUrl;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save calendar selection:", error);
    return NextResponse.json(
      { error: "Failed to save calendar selection" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session?.endpoint || !session?.username || !session?.password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ 
      selectedCalendarUrl: session.selectedCalendarUrl || null 
    });
  } catch (error) {
    console.error("Failed to get calendar selection:", error);
    return NextResponse.json(
      { error: "Failed to get calendar selection" },
      { status: 500 }
    );
  }
} 