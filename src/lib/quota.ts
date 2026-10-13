// src/lib/quota.ts
// Per-user storage quota management

import { db } from "./db";
import { users } from "./db/schema";
import { eq, sql } from "drizzle-orm";

export const DEFAULT_QUOTA_BYTES =
  parseInt(process.env.DEFAULT_QUOTA_BYTES || "1073741824", 10); // 1 GB

export const MAX_FILE_SIZE_BYTES =
  parseInt(process.env.MAX_FILE_SIZE_BYTES || "52428800", 10); // 50 MB

/**
 * Check if a user has enough quota for a given upload size.
 * Throws if quota would be exceeded.
 */
export async function checkQuota(userId: string, fileSizeBytes: number): Promise<void> {
  const user = await db
    .select({ storageUsedBytes: users.storageUsedBytes, storageQuotaBytes: users.storageQuotaBytes })
    .from(users)
    .where(eq(users.id, userId))
    .then((rows) => rows[0]);

  if (!user) throw new Error("User not found");

  const remaining = user.storageQuotaBytes - user.storageUsedBytes;
  if (fileSizeBytes > remaining) {
    throw new Error(
      `Storage quota exceeded. You have ${formatBytes(remaining)} remaining, but the file is ${formatBytes(fileSizeBytes)}.`
    );
  }
}

/**
 * Atomically increment a user's used storage.
 */
export async function incrementUsedStorage(
  userId: string,
  bytes: number
): Promise<void> {
  await db
    .update(users)
    .set({
      storageUsedBytes: sql`storage_used_bytes + ${bytes}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Atomically decrement a user's used storage (for deletions).
 */
export async function decrementUsedStorage(
  userId: string,
  bytes: number
): Promise<void> {
  await db
    .update(users)
    .set({
      storageUsedBytes: sql`GREATEST(0, storage_used_bytes - ${bytes})`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
