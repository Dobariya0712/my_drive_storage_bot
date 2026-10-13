// src/types/index.ts
// Shared TypeScript types for the entire application

export interface User {
  id: string;
  email: string;
  role: "user" | "admin";
  storageQuotaBytes: number;
  storageUsedBytes: number;
  createdAt: Date;
}

export interface SessionUser {
  id: string;
  email: string;
  role: "user" | "admin";
}

export interface FileRecord {
  id: string;
  ownerId: string;
  folderId: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  telegramFileId: string | null;
  telegramMessageId: number | null;
  telegramChatId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FolderRecord {
  id: string;
  ownerId: string;
  parentFolderId: string | null;
  name: string;
  createdAt: Date;
}

export interface ShareLink {
  id: string;
  fileId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface StorageStats {
  totalFiles: number;
  usedBytes: number;
  quotaBytes: number;
  recentFiles: FileRecord[];
}

export type FileViewMode = "grid" | "list";
export type FileSortBy = "name" | "size" | "createdAt" | "type";
export type FileSortOrder = "asc" | "desc";

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}
