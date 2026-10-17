// src/app/api/auth/login/route.ts
// POST /api/auth/login

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validations";
import { apiSuccess, apiError, handleApiError, rateLimit, resetRateLimit } from "@/lib/api";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(
        "DATABASE_URL is not configured in Vercel Environment Variables. Please set DATABASE_URL in Vercel project settings.",
        500
      );
    }

    // Rate limit: max 15 login attempts per IP per 15 minutes
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      request.headers.get("cf-connecting-ip") ||
      "127.0.0.1";

    if (!rateLimit(ip, 15, 15 * 60 * 1000)) {
      return apiError("Too many login attempts. Please try again later.", 429);
    }

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .then((r) => r[0]);

    // Constant-time failure to prevent user enumeration
    if (!user) {
      await verifyPassword("scrypt:0000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", password).catch(() => {});
      return apiError("Invalid email or password.", 401);
    }

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) {
      return apiError("Invalid email or password.", 401);
    }

    // Reset rate limiter on successful authentication
    resetRateLimit(ip);

    const isOwner =
      user.email.toLowerCase() === "dobariya2008@gmail.com" ||
      user.email.toLowerCase() === "dishant7122008@gmail.com";
    const effectiveRole: "admin" | "user" = (isOwner || user.role === "admin") ? "admin" : "user";

    if (isOwner && user.role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
    }

    const session = await getSession();
    session.user = { id: user.id, email: user.email, role: effectiveRole };
    await session.save();

    return apiSuccess({
      id: user.id,
      email: user.email,
      role: effectiveRole,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
