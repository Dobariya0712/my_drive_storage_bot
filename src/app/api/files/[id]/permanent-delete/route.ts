// src/app/api/files/[id]/permanent-delete/route.ts
// DELETE /api/files/[id]/permanent-delete
// Permanently deletes a file: removes from DB and attempts Telegram message deletion
// Also decrements the owner's storage usage

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { getStorageAdapter } from "@/lib/storage";
import { decrementUsedStorage } from "@/lib/quota";
import { apiSuccess, apiError, handleApiError } from "@/lib/api";
import { eq, and, isNotNull } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const sessionUser = await requireAuth();
    const { id } = await params;

    // Only allow permanently deleting files in trash (soft-deleted)
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

    // Attempt to delete from Telegram (best-effort, non-fatal)
    if (file.telegramMessageId && file.telegramChatId) {
      const adapter = getStorageAdapter();
      await adapter
        .deleteFile(file.telegramMessageId, file.telegramChatId)
        .catch((err) =>
          console.warn("Telegram deletion failed (non-fatal):", err)
        );
    }

    // Delete from database
    await db
      .delete(files)
      .where(and(eq(files.id, id), eq(files.ownerId, sessionUser.id)));

    // Decrement storage usage
    await decrementUsedStorage(sessionUser.id, file.sizeBytes);

    return apiSuccess({ message: "File permanently deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
