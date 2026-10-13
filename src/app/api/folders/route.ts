// src/app/api/folders/route.ts
// GET  /api/folders   — list folders for authenticated user
// POST /api/folders   — create a new folder

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { folders } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { createFolderSchema } from "@/lib/validations";
import { apiSuccess, handleApiError } from "@/lib/api";
import { eq, isNull, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const url = new URL(request.url);
    const parentFolderId = url.searchParams.get("parentFolderId");

    const conditions = [eq(folders.ownerId, sessionUser.id)];
    if (parentFolderId) {
      conditions.push(eq(folders.parentFolderId, parentFolderId));
    } else {
      conditions.push(isNull(folders.parentFolderId));
    }

    const rows = await db
      .select()
      .from(folders)
      .where(and(...conditions));

    return apiSuccess({ folders: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json();
    const { name, parentFolderId } = createFolderSchema.parse(body);

    const folderId = uuidv4();
    await db.insert(folders).values({
      id: folderId,
      ownerId: sessionUser.id,
      parentFolderId: parentFolderId || null,
      name,
    });

    const folder = await db
      .select()
      .from(folders)
      .where(eq(folders.id, folderId))
      .then((r) => r[0]);

    return apiSuccess(folder, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
