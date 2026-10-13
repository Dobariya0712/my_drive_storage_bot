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

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();

    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      role: "user",
      storageQuotaBytes: DEFAULT_QUOTA_BYTES,
      storageUsedBytes: 0,
    });

    // Create session
    const session = await getSession();
    session.user = { id: userId, email, role: "user" };
    await session.save();

    return apiSuccess({ id: userId, email, role: "user" }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
