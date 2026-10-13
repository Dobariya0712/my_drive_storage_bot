// src/app/api/share/[token]/route.ts
// GET /api/share/[token] — download a file via share link (no auth required)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { files, shareLinks } from "@/lib/db/schema";
import { getStorageAdapter } from "@/lib/storage";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { and, eq, isNull } from "drizzle-orm";
import { createHash } from "crypto";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    // Hash the provided token and look it up
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const link = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.tokenHash, tokenHash))
      .then((r) => r[0]);

    if (!link) {
      return apiError("Share link not found or invalid", 404);
    }

    // Check expiry
    if (new Date() > link.expiresAt) {
      return apiError("Share link has expired", 410);
    }

    // Check revocation
    if (link.revokedAt) {
      return apiError("Share link has been revoked", 410);
    }

    // Get the file (not deleted)
    const file = await db
      .select()
      .from(files)
      .where(and(eq(files.id, link.fileId), isNull(files.deletedAt)))
      .then((r) => r[0]);

    if (!file) {
      return apiError("File not found", 404);
    }

    if (request.nextUrl.searchParams.get("info") === "true") {
      return apiSuccess({
        file: {
          id: file.id,
          originalName: file.originalName,
          sizeBytes: file.sizeBytes,
          mimeType: file.mimeType,
          createdAt: file.createdAt,
        },
      });
    }

    if (!file.telegramFileId) {
      return apiError("File is not available", 400);
    }

    const adapter = getStorageAdapter();
    const fileUrl = await adapter.getFileUrl(file.telegramFileId);

    // Handle mock adapter
    if (fileUrl.startsWith("mock://")) {
      const { mockStorageAdapter } = await import("@/lib/storage/mock");
      const buffer = mockStorageAdapter.getBuffer(file.telegramFileId);
      if (!buffer) {
        return apiError("File data not found", 404);
      }
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": file.mimeType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const telegramResponse = await fetch(fileUrl);
    if (!telegramResponse.ok) {
      return apiError("Failed to retrieve file", 502);
    }

    return new NextResponse(telegramResponse.body, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/share/[token] — revoke a share link
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // Only the file owner can revoke — get the link and verify ownership via session
    const { getSession } = await import("@/lib/auth/session");
    const session = await getSession();
    if (!session.user) {
      return apiError("Unauthorized", 401);
    }

    const link = await db
      .select({ id: shareLinks.id, fileId: shareLinks.fileId })
      .from(shareLinks)
      .where(eq(shareLinks.tokenHash, tokenHash))
      .then((r) => r[0]);

    if (!link) {
      return apiError("Share link not found", 404);
    }

    // Verify ownership by checking the file
    const file = await db
      .select({ ownerId: files.ownerId })
      .from(files)
      .where(eq(files.id, link.fileId))
      .then((r) => r[0]);

    if (!file || file.ownerId !== session.user.id) {
      return apiError("Forbidden", 403);
    }

    await db
      .update(shareLinks)
      .set({ revokedAt: new Date() })
      .where(eq(shareLinks.id, link.id));

    return NextResponse.json({ success: true, message: "Share link revoked" });
  } catch (err) {
    return handleApiError(err);
  }
}
