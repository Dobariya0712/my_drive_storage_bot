-- ============================================================
-- TeleCloud: Supabase Database Schema
-- Run this script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Enable pgcrypto extension for UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create user_role enum if it doesn't already exist
DO $$ BEGIN
    CREATE TYPE "public"."user_role" AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Users Table
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" text NOT NULL,
    "password_hash" text NOT NULL,
    "role" "public"."user_role" DEFAULT 'user' NOT NULL,
    "storage_quota_bytes" bigint DEFAULT 1073741824 NOT NULL, -- 1 GB default quota
    "storage_used_bytes" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 4. Sessions Table
CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 5. Folders Table
CREATE TABLE IF NOT EXISTS "public"."folders" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
    "owner_id" text NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "parent_folder_id" text REFERENCES "public"."folders"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 6. Files Table
CREATE TABLE IF NOT EXISTS "public"."files" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
    "owner_id" text NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "folder_id" text REFERENCES "public"."folders"("id") ON DELETE SET NULL,
    "original_name" text NOT NULL,
    "mime_type" text NOT NULL,
    "size_bytes" bigint NOT NULL,
    "telegram_file_id" text,
    "telegram_message_id" integer,
    "telegram_chat_id" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "deleted_at" timestamp -- Soft delete for Trash feature
);

-- 7. Share Links Table
CREATE TABLE IF NOT EXISTS "public"."share_links" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
    "file_id" text NOT NULL REFERENCES "public"."files"("id") ON DELETE CASCADE,
    "token_hash" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "revoked_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 8. Indexes for High Performance
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "public"."users" ("email");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "public"."sessions" ("user_id");

CREATE INDEX IF NOT EXISTS "folders_owner_id_idx" ON "public"."folders" ("owner_id");
CREATE INDEX IF NOT EXISTS "folders_parent_idx" ON "public"."folders" ("parent_folder_id");

CREATE INDEX IF NOT EXISTS "files_owner_id_idx" ON "public"."files" ("owner_id");
CREATE INDEX IF NOT EXISTS "files_folder_id_idx" ON "public"."files" ("folder_id");
CREATE INDEX IF NOT EXISTS "files_deleted_at_idx" ON "public"."files" ("deleted_at");
CREATE INDEX IF NOT EXISTS "files_owner_name_idx" ON "public"."files" ("owner_id", "original_name");

CREATE INDEX IF NOT EXISTS "share_links_file_id_idx" ON "public"."share_links" ("file_id");
CREATE UNIQUE INDEX IF NOT EXISTS "share_links_token_hash_idx" ON "public"."share_links" ("token_hash");
