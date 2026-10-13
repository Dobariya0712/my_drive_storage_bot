// src/app/api/files/route.ts
// GET  /api/files  — list files for authenticated user
// POST /api/files  — upload a new file

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { getStorageAdapter } from "@/lib/storage";
import {
  checkQuota,
  incrementUsedStorage,
} from "@/lib/quota";
import {
  validateFileType,
  validateFileSize,
  fileQuerySchema,
} from "@/lib/validations";
import { apiSuccess, apiError, handleApiError } from "@/lib/api";
import { eq, and, isNull, isNotNull, ilike, asc, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ─── GET: list files ─────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const query = fileQuerySchema.parse(params);

    const conditions = [eq(files.ownerId, sessionUser.id)];

    // Folder filter
    if (query.folderId !== undefined) {
      if (query.folderId === null) {
        conditions.push(isNull(files.folderId));
      } else {
        conditions.push(eq(files.folderId, query.folderId));
      }
    }

    // Soft delete filter
    if (query.includeDeleted) {
      conditions.push(isNotNull(files.deletedAt));
    } else {
      conditions.push(isNull(files.deletedAt));
    }

    // Type filter
    if (query.type && query.type !== "all") {
      const typeMap: Record<string, string> = {
        image: "image/%",
        video: "video/%",
        document: "application/%",
        other: "",
      };
      if (query.type !== "other") {
        conditions.push(ilike(files.mimeType, typeMap[query.type]));
      }
    }

    // Search
    if (query.search) {
      conditions.push(ilike(files.originalName, `%${query.search}%`));
    }

    // Sorting
    const sortCol =
      query.sortBy === "name"
        ? files.originalName
        : query.sortBy === "size"
        ? files.sizeBytes
        : query.sortBy === "type"
        ? files.mimeType
        : files.createdAt;

    const orderFn = query.sortOrder === "asc" ? asc : desc;

    const offset = (query.page - 1) * query.pageSize;

    const rows = await db
      .select()
      .from(files)
      .where(and(...conditions))
      .orderBy(orderFn(sortCol))
      .limit(query.pageSize)
      .offset(offset);

    return apiSuccess({ files: rows, page: query.page, pageSize: query.pageSize });
  } catch (err) {
    return handleApiError(err);
  }
}

// ─── POST: upload file ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return apiError("No file provided", 400);
    }

    // Validate file size
    validateFileSize(file.size);

    // Validate file type
    if (!validateFileType(file.type)) {
      return apiError(`File type "${file.type}" is not allowed.`, 400);
    }

    // Check quota before upload
    await checkQuota(sessionUser.id, file.size);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage backend
    const adapter = getStorageAdapter();
    let uploadResult;
    try {
      uploadResult = await adapter.uploadFile(buffer, file.name, file.type);
    } catch (uploadErr) {
      const msg = uploadErr instanceof Error ? uploadErr.message : "Upload failed";
      return apiError(msg, 502);
    }

    // Save metadata to database ONLY after successful upload
    const fileId = uuidv4();
    const now = new Date();

    await db.insert(files).values({
      id: fileId,
      ownerId: sessionUser.id,
      folderId: folderId || null,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      telegramFileId: uploadResult.telegramFileId,
      telegramMessageId: uploadResult.telegramMessageId,
      telegramChatId: uploadResult.telegramChatId,
      createdAt: now,
      updatedAt: now,
    });

    // Update user's storage usage atomically
    await incrementUsedStorage(sessionUser.id, file.size);

    const fileRecord = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .then((r) => r[0]);

    return apiSuccess(fileRecord, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
