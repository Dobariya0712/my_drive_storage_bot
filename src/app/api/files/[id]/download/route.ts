// src/app/api/files/[id]/download/route.ts
// GET /api/files/[id]/download — stream file to authenticated user
// The bot token is NEVER exposed to the browser. The server proxies the download.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { getStorageAdapter } from "@/lib/storage";
import { apiError, handleApiError } from "@/lib/api";
import { eq, and, isNull } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const sessionUser = await requireAuth();
    const { id } = await params;

    // Fetch file ensuring ownership
    const file = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.id, id),
          eq(files.ownerId, sessionUser.id),
          isNull(files.deletedAt)
        )
      )
      .then((r) => r[0]);

    if (!file) {
      return apiError("File not found", 404);
    }

    if (!file.telegramFileId) {
      return apiError("File is not available for download", 400);
    }

    const adapter = getStorageAdapter();
    const fileUrl = await adapter.getFileUrl(file.telegramFileId);

    // Handle mock adapter (local dev)
    if (fileUrl.startsWith("mock://")) {
      const { mockStorageAdapter } = await import("@/lib/storage/mock");
      const buffer = mockStorageAdapter.getBuffer(file.telegramFileId);
      if (!buffer) {
        return apiError("File data not found in mock storage", 404);
      }
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": file.mimeType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
          "Content-Length": String(buffer.length),
          "Cache-Control": "no-store",
        },
      });
    }

    // Stream from Telegram (bot token is server-side only)
    const telegramResponse = await fetch(fileUrl);
    if (!telegramResponse.ok) {
      return apiError("Failed to retrieve file from storage", 502);
    }

    return new NextResponse(telegramResponse.body, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
        "Content-Length": String(file.sizeBytes),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
