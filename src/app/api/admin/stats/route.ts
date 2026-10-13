// src/app/api/admin/stats/route.ts
// GET /api/admin/stats

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, files } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/api";
import { sql, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.user) {
      return apiError("Unauthorized", 401);
    }
    if (session.user.role !== "admin") {
      return apiError("Forbidden: Admin access required", 403);
    }

    const allUsers = await db.select().from(users);
    const totalUsers = allUsers.length;
    const totalStorageUsed = allUsers.reduce((sum, u) => sum + (u.storageUsedBytes || 0), 0);
    const totalStorageQuota = allUsers.reduce((sum, u) => sum + (u.storageQuotaBytes || 0), 0);

    const activeFiles = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(isNull(files.deletedAt));

    const totalFiles = Number(activeFiles[0]?.count || 0);

    return apiSuccess({
      totalUsers,
      totalStorageUsed,
      totalStorageQuota,
      totalFiles,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
