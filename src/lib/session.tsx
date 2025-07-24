import { SessionOptions } from "iron-session";

export interface SessionData {
    endpoint?: string;
    username?: string;
    password?: string;
    selectedCalendarUrl?: string;
}

export const defaultSession: SessionData = {};

export const sessionOptions: SessionOptions = {
    password: process.env.SESSION_PASSWORD!,
    cookieName: "session",
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
    },
};
