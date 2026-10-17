// src/lib/validations.ts
// Zod validation schemas for all API routes

import { z } from "zod";
import { MAX_FILE_SIZE_BYTES } from "./quota";

// ─── Auth ────────────────────────────────────────────────────
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─── Folders ─────────────────────────────────────────────────
export const createFolderSchema = z.object({
  name: z
    .string()
    .min(1, "Folder name is required")
    .max(255, "Folder name is too long")
    .regex(/^[^/\\:*?"<>|]+$/, "Folder name contains invalid characters"),
  parentFolderId: z.string().uuid().nullable().optional(),
});

export const renameFolderSchema = z.object({
  name: z
    .string()
    .min(1, "Folder name is required")
    .max(255, "Folder name is too long")
    .regex(/^[^/\\:*?"<>|]+$/, "Folder name contains invalid characters"),
});

// ─── Files ───────────────────────────────────────────────────
export const renameFileSchema = z.object({
  name: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name is too long"),
});

export const moveFileSchema = z.object({
  folderId: z.string().uuid().nullable(),
});

export const fileQuerySchema = z.object({
  folderId: z.string().uuid().nullable().optional(),
  search: z.string().max(100).optional(),
  type: z.enum(["image", "video", "document", "other", "all"]).optional().default("all"),
  sortBy: z.enum(["name", "size", "createdAt", "type"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  includeDeleted: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
});

// ─── Share Links ─────────────────────────────────────────────
export const createShareLinkSchema = z.object({
  fileId: z.string().uuid("Invalid file ID"),
  expiresInHours: z
    .number()
    .int()
    .min(1, "Must expire in at least 1 hour")
    .max(720, "Cannot expire in more than 30 days (720 hours)")
    .default(24),
});

// ─── File Upload Validation (server-side) ────────────────────
export const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "image/bmp", "image/tiff",
  // Video
  "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo",
  // Audio
  "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text
  "text/plain", "text/csv", "text/html", "text/markdown",
  // Archives
  "application/zip", "application/x-rar-compressed", "application/x-7z-compressed",
  "application/x-tar", "application/gzip",
  // Code
  "application/json", "application/xml", "application/javascript",
]);

export function validateFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function validateFileSize(sizeBytes: number): void {
  if (sizeBytes <= 0) {
    throw new Error("File is empty.");
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const maxGB = (MAX_FILE_SIZE_BYTES / (1024 * 1024 * 1024)).toFixed(0);
    throw new Error(
      `File size (${(sizeBytes / 1024 / 1024).toFixed(1)} MB) exceeds the maximum allowed size of ${maxGB} GB.`
    );
  }
}
