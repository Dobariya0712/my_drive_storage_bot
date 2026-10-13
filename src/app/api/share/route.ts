// src/app/api/share/route.ts
// POST /api/share — create a share link for a file

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { files, shareLinks } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { createShareLinkSchema } from "@/lib/validations";
import { apiSuccess, apiError, handleApiError } from "@/lib/api";
import { eq, and, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createHash, randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json();
    const { fileId, expiresInHours } = createShareLinkSchema.parse(body);

    // Verify file ownership
    const file = await db
      .select({ id: files.id })
      .from(files)
      .where(
        and(
          eq(files.id, fileId),
          eq(files.ownerId, sessionUser.id),
          isNull(files.deletedAt)
        )
      )
      .then((r) => r[0]);

    if (!file) {
      return apiError("File not found", 404);
    }

    // Generate a cryptographically secure token
    const rawToken = randomBytes(32).toString("hex");
    // Store only a SHA-256 hash (share tokens don't need the argon2 cost)
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    const linkId = uuidv4();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await db.insert(shareLinks).values({
      id: linkId,
      fileId,
      tokenHash,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return apiSuccess({
      shareUrl: `${appUrl}/share/${rawToken}`,
      expiresAt,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
