// src/app/api/files/[id]/restore/route.ts
// POST /api/files/[id]/restore — restore a soft-deleted file from trash

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { apiSuccess, apiError, handleApiError } from "@/lib/api";
import { eq, and, isNotNull } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const sessionUser = await requireAuth();
    const { id } = await params;

    // Only allow restoring files owned by this user that are in trash
    const file = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.id, id),
          eq(files.ownerId, sessionUser.id),
          isNotNull(files.deletedAt)
        )
      )
      .then((r) => r[0]);

    if (!file) {
      return apiError("File not found in trash", 404);
    }

    await db
      .update(files)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(files.id, id), eq(files.ownerId, sessionUser.id)));

    return apiSuccess({ message: "File restored successfully" });
  } catch (err) {
    return handleApiError(err);
  }
}
