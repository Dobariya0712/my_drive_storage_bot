// src/app/api/auth/me/route.ts
// GET /api/auth/me — return current session user info + storage stats

import { apiSuccess, apiError, handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.user) {
      return apiError("Unauthorized", 401);
    }

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        storageQuotaBytes: users.storageQuotaBytes,
        storageUsedBytes: users.storageUsedBytes,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .then((r) => r[0]);

    if (!user) {
      return apiError("User not found", 404);
    }

    return apiSuccess(user);
  } catch (err) {
    return handleApiError(err);
  }
}
