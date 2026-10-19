// src/app/api/files/batch/route.ts
// POST /api/files/batch — perform batch operations on multiple files

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { getStorageAdapter } from "@/lib/storage";
import { decrementUsedStorage } from "@/lib/quota";
import { apiSuccess, apiError, handleApiError } from "@/lib/api";
import { eq, and, inArray, isNull, isNotNull } from "drizzle-orm";
import { z } from "zod";

const batchActionSchema = z.object({
  action: z.enum(["trash", "restore", "permanent-delete"]),
  fileIds: z.array(z.string().min(1)).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json();
    const parsed = batchActionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Invalid batch request parameters", 400);
    }

    const { action, fileIds } = parsed.data;

    if (action === "trash") {
      // Soft-delete selected files
      const result = await db
        .update(files)
        .set({ deletedAt: new Date() })
        .where(
          and(
            inArray(files.id, fileIds),
            eq(files.ownerId, sessionUser.id),
            isNull(files.deletedAt)
          )
        );

      return apiSuccess({
        message: `${fileIds.length} file(s) moved to trash`,
        count: fileIds.length,
      });
    }

    if (action === "restore") {
      // Restore selected files from trash
      await db
        .update(files)
        .set({ deletedAt: null })
        .where(
          and(
            inArray(files.id, fileIds),
            eq(files.ownerId, sessionUser.id),
            isNotNull(files.deletedAt)
          )
        );

      return apiSuccess({
        message: `${fileIds.length} file(s) restored`,
        count: fileIds.length,
      });
    }

    if (action === "permanent-delete") {
      // Find files to be permanently deleted
      const filesToDelete = await db
        .select()
        .from(files)
        .where(
          and(
            inArray(files.id, fileIds),
            eq(files.ownerId, sessionUser.id),
            isNotNull(files.deletedAt)
          )
        );

      if (filesToDelete.length === 0) {
        return apiError("No matching files found in trash", 404);
      }

      const adapter = getStorageAdapter();
      let totalBytesDeleted = 0;

      for (const file of filesToDelete) {
        totalBytesDeleted += file.sizeBytes;
        if (file.telegramMessageId && file.telegramChatId) {
          await adapter
            .deleteFile(file.telegramMessageId, file.telegramChatId)
            .catch((err) =>
              console.warn(`Telegram deletion failed for ${file.id}:`, err)
            );
        }
      }

      const validIds = filesToDelete.map((f) => f.id);
      await db
        .delete(files)
        .where(
          and(inArray(files.id, validIds), eq(files.ownerId, sessionUser.id))
        );

      if (totalBytesDeleted > 0) {
        await decrementUsedStorage(sessionUser.id, totalBytesDeleted);
      }

      return apiSuccess({
        message: `${filesToDelete.length} file(s) permanently deleted`,
        count: filesToDelete.length,
      });
    }

    return apiError("Unsupported action", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
