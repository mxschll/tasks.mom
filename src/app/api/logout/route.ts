import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Clear all session data
    session.endpoint = undefined;
    session.username = undefined;
    session.password = undefined;
    session.selectedCalendarUrl = undefined;

    // Save the cleared session (this removes the session cookie)
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to logout:", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
} 