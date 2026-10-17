// src/app/api/admin/users/[id]/route.ts
// PATCH and DELETE /api/admin/users/[id]

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/api";
import { isUserAdmin } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateUserSchema = z.object({
  storageQuotaBytes: z
    .number()
    .positive()
    .max(Number.MAX_SAFE_INTEGER, "Storage quota exceeds maximum allowed limit")
    .optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.user) return apiError("Unauthorized", 401);
    if (!isUserAdmin(session.user)) return apiError("Forbidden: Admin access required", 403);

    const { id } = await params;
    const body = await request.json();
    const data = updateUserSchema.parse(body);

    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);

    if (!targetUser) return apiError("User not found", 404);

    const updated = await db
      .update(users)
      .set({
        ...(data.storageQuotaBytes !== undefined && { storageQuotaBytes: data.storageQuotaBytes }),
        ...(data.role !== undefined && { role: data.role }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        storageQuotaBytes: users.storageQuotaBytes,
        storageUsedBytes: users.storageUsedBytes,
      })
      .then((r) => r[0]);

    return apiSuccess(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.user) return apiError("Unauthorized", 401);
    if (!isUserAdmin(session.user)) return apiError("Forbidden: Admin access required", 403);

    const { id } = await params;
    if (session.user.id === id) {
      return apiError("You cannot delete your own admin account", 400);
    }

    await db.delete(users).where(eq(users.id, id));
    return apiSuccess({ message: "User deleted successfully" });
  } catch (err) {
    return handleApiError(err);
  }
}
