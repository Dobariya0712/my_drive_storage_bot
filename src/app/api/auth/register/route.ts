// src/app/api/auth/register/route.ts
// POST /api/auth/register

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validations";
import { apiSuccess, apiError, handleApiError, rateLimit } from "@/lib/api";
import { DEFAULT_QUOTA_BYTES } from "@/lib/quota";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(
        "DATABASE_URL is not configured in Vercel Environment Variables. Please set DATABASE_URL in Vercel project settings.",
        500
      );
    }

    // Rate limit: max 10 registrations per IP per 15 minutes
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(ip, 10, 15 * 60 * 1000)) {
      return apiError("Too many registration attempts. Please try again later.", 429);
    }

    const body = await request.json();
    const { email, password } = registerSchema.parse(body);

    // Check if email already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .then((r) => r[0]);

    if (existing) {
      return apiError("An account with this email already exists.", 409);
    }

    // Automatically make the first user or project owner an admin
    const userCount = await db
      .select({ id: users.id })
      .from(users)
      .limit(1);

    const isFirstUser = userCount.length === 0;
    const isOwnerEmail = email.toLowerCase().includes("dishant7122008@gmail.com");
    const role: "admin" | "user" = (isFirstUser || isOwnerEmail) ? "admin" : "user";

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();

    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      role,
      storageQuotaBytes: DEFAULT_QUOTA_BYTES,
      storageUsedBytes: 0,
    });

    // Create session
    const session = await getSession();
    session.user = { id: userId, email, role };
    await session.save();

    return apiSuccess({ id: userId, email, role }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
