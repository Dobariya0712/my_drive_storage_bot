// src/app/api/admin/users/route.ts
// GET /api/admin/users

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/api";
import { desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.user) {
      return apiError("Unauthorized", 401);
    }
    if (session.user.role !== "admin") {
      return apiError("Forbidden: Admin access required", 403);
    }

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        storageQuotaBytes: users.storageQuotaBytes,
        storageUsedBytes: users.storageUsedBytes,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return apiSuccess(allUsers);
  } catch (err) {
    return handleApiError(err);
  }
}
