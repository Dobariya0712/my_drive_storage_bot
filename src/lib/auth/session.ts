// src/lib/auth/session.ts
// iron-session configuration and session helpers

import { SessionOptions, getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionUser } from "@/types";

export interface IronSessionData {
  user?: SessionUser;
  sessionId?: string; // DB session record ID for revocation
}

const isSecure =
  process.env.VERCEL === "1" ||
  (process.env.NODE_ENV === "production" &&
    Boolean(process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")));

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "REPLACE_THIS_WITH_A_SECURE_RANDOM_SECRET_OF_AT_LEAST_32_CHARS",
  cookieName: process.env.SESSION_COOKIE_NAME || "telecloud_session",
  cookieOptions: {
    secure: isSecure,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  },
  ttl: 60 * 60 * 24 * 7, // 7 days
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<IronSessionData>(cookieStore, sessionOptions);
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}
