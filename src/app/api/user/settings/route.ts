// src/app/api/user/settings/route.ts
// PATCH /api/user/settings — update password (email change can be added later)

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changePasswordSchema } from "@/lib/validations";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { eq } from "drizzle-orm";

export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    // Fetch current hash
    const user = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .then((r) => r[0]);

    if (!user) throw new Error("NOT_FOUND");

    const valid = await verifyPassword(user.passwordHash, currentPassword);
    if (!valid) {
      return apiError("Current password is incorrect", 400);
    }

    const newHash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, sessionUser.id));

    return apiSuccess({ message: "Password changed successfully" });
  } catch (err) {
    return handleApiError(err);
  }
}
