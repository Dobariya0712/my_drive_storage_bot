// src/lib/storage/mock.ts
// Mock storage adapter for local development and testing
// Does NOT require Telegram credentials

import { v4 as uuidv4 } from "uuid";
import { StorageAdapter, UploadResult } from "./adapter";

// In-memory store for mock files: fileId -> base64 buffer
const mockStore = new Map<string, Buffer>();

export class MockStorageAdapter implements StorageAdapter {
  async uploadFile(
    buffer: Buffer,
    filename: string,
    _mimeType: string
  ): Promise<UploadResult> {
    const fileId = `mock_${uuidv4()}`;
    mockStore.set(fileId, buffer);

    console.log(`[MockStorage] Stored file "${filename}" as ${fileId}`);

    return {
      telegramFileId: fileId,
      telegramMessageId: Math.floor(Math.random() * 1_000_000),
      telegramChatId: "mock_chat",
    };
  }

  async getFileUrl(telegramFileId: string): Promise<string> {
    // Return a data URL for mock files so downloads work locally
    const buf = mockStore.get(telegramFileId);
    if (!buf) {
      throw new Error(`[MockStorage] File not found: ${telegramFileId}`);
    }
    // For real streaming we return a special sentinel — the download route
    // handles this by reading from the in-memory store
    return `mock://${telegramFileId}`;
  }

  async deleteFile(
    _telegramMessageId: number,
    _telegramChatId: string
  ): Promise<boolean> {
    return true; // No-op for mock
  }

  /** For testing: retrieve the raw buffer */
  getBuffer(fileId: string): Buffer | undefined {
    return mockStore.get(fileId);
  }

  /** For testing: clear all stored files */
  clear(): void {
    mockStore.clear();
  }
}

// Singleton mock adapter shared across test runs
export const mockStorageAdapter = new MockStorageAdapter();
