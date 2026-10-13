// src/app/api/files/[id]/route.ts
// GET    /api/files/[id]   — get file metadata
// PATCH  /api/files/[id]   — rename or move file
// DELETE /api/files/[id]   — soft delete (move to trash)

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { renameFileSchema, moveFileSchema } from "@/lib/validations";
import { apiSuccess, apiError, handleApiError } from "@/lib/api";
import { eq, and, isNull } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

async function getOwnedFile(fileId: string, userId: string) {
  const file = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.ownerId, userId), isNull(files.deletedAt)))
    .then((r) => r[0]);
  if (!file) throw new Error("NOT_FOUND");
  return file;
}

// GET — metadata
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const sessionUser = await requireAuth();
    const { id } = await params;
    const file = await getOwnedFile(id, sessionUser.id);
    // Strip internal Telegram fields from response
    const { telegramFileId: _t, telegramChatId: _c, ...safe } = file;
    return apiSuccess(safe);
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH — rename or move
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const sessionUser = await requireAuth();
    const { id } = await params;
    await getOwnedFile(id, sessionUser.id); // ownership check

    const body = await req.json();

    // Determine operation: rename or move
    if ("name" in body) {
      const { name } = renameFileSchema.parse(body);
      await db
        .update(files)
        .set({ originalName: name, updatedAt: new Date() })
        .where(and(eq(files.id, id), eq(files.ownerId, sessionUser.id)));
    } else if ("folderId" in body) {
      const { folderId } = moveFileSchema.parse(body);
      await db
        .update(files)
        .set({ folderId, updatedAt: new Date() })
        .where(and(eq(files.id, id), eq(files.ownerId, sessionUser.id)));
    } else {
      return apiError("No valid fields to update", 400);
    }

    const updated = await db
      .select()
      .from(files)
      .where(eq(files.id, id))
      .then((r) => r[0]);
    return apiSuccess(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE — soft delete (trash)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const sessionUser = await requireAuth();
    const { id } = await params;
    await getOwnedFile(id, sessionUser.id); // ownership check

    await db
      .update(files)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(files.id, id), eq(files.ownerId, sessionUser.id)));

    return apiSuccess({ message: "File moved to trash" });
  } catch (err) {
    return handleApiError(err);
  }
}
