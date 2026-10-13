// src/app/api/folders/[id]/route.ts
// PATCH  /api/folders/[id]  — rename folder
// DELETE /api/folders/[id]  — delete folder (cascades to subfolders/files via DB FK)

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { folders } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { renameFolderSchema } from "@/lib/validations";
import { apiSuccess, handleApiError } from "@/lib/api";
import { eq, and } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

async function getOwnedFolder(folderId: string, userId: string) {
  const folder = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.ownerId, userId)))
    .then((r) => r[0]);
  if (!folder) throw new Error("NOT_FOUND");
  return folder;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const sessionUser = await requireAuth();
    const { id } = await params;
    await getOwnedFolder(id, sessionUser.id);

    const body = await req.json();
    const { name } = renameFolderSchema.parse(body);

    await db
      .update(folders)
      .set({ name })
      .where(and(eq(folders.id, id), eq(folders.ownerId, sessionUser.id)));

    const updated = await db
      .select()
      .from(folders)
      .where(eq(folders.id, id))
      .then((r) => r[0]);

    return apiSuccess(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const sessionUser = await requireAuth();
    const { id } = await params;
    await getOwnedFolder(id, sessionUser.id);

    // Cascade delete is handled by DB FK (ON DELETE CASCADE on subfolders and files.folder_id SET NULL)
    await db
      .delete(folders)
      .where(and(eq(folders.id, id), eq(folders.ownerId, sessionUser.id)));

    return apiSuccess({ message: "Folder deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
