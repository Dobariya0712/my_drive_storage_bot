// src/lib/db/schema.ts
// Drizzle ORM schema for all database tables

import {
  pgTable,
  text,
  timestamp,
  bigint,
  integer,
  pgEnum,
  index,
  foreignKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ────────────────────────────────────────────────────────────
// Enums
// ────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// ────────────────────────────────────────────────────────────
// Users
// ────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    storageQuotaBytes: bigint("storage_quota_bytes", { mode: "number" })
      .notNull()
      .default(1073741824), // 1 GB default
    storageUsedBytes: bigint("storage_used_bytes", { mode: "number" })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

// ────────────────────────────────────────────────────────────
// Sessions (server-side; iron-session stores in cookie but
// we also maintain a DB record for revocation)
// ────────────────────────────────────────────────────────────
export const sessions = pgTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)]
);

// ────────────────────────────────────────────────────────────
// Folders
// ────────────────────────────────────────────────────────────
export const folders = pgTable(
  "folders",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentFolderId: text("parent_folder_id"), // self-referential, added via FK below
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("folders_owner_id_idx").on(t.ownerId),
    index("folders_parent_idx").on(t.parentFolderId),
    foreignKey({
      columns: [t.parentFolderId],
      foreignColumns: [t.id],
    }).onDelete("cascade"),
  ]
);

// ────────────────────────────────────────────────────────────
// Files
// ────────────────────────────────────────────────────────────
export const files = pgTable(
  "files",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: text("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    telegramFileId: text("telegram_file_id"),
    telegramMessageId: integer("telegram_message_id"),
    telegramChatId: text("telegram_chat_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"), // soft delete
  },
  (t) => [
    index("files_owner_id_idx").on(t.ownerId),
    index("files_folder_id_idx").on(t.folderId),
    index("files_deleted_at_idx").on(t.deletedAt),
    index("files_owner_name_idx").on(t.ownerId, t.originalName),
  ]
);

// ────────────────────────────────────────────────────────────
// Share Links
// ────────────────────────────────────────────────────────────
export const shareLinks = pgTable(
  "share_links",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(), // bcrypt hash of the raw token
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("share_links_file_id_idx").on(t.fileId),
    uniqueIndex("share_links_token_hash_idx").on(t.tokenHash),
  ]
);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type FileRow = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type FolderRow = typeof folders.$inferSelect;
export type ShareLinkRow = typeof shareLinks.$inferSelect;
