// src/lib/storage/index.ts
// Factory function to return the correct storage adapter based on env

import { StorageAdapter } from "./adapter";
import { MockStorageAdapter } from "./mock";

let _adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (_adapter) return _adapter;

  const adapterType = process.env.STORAGE_ADAPTER || "mock";

  if (adapterType === "telegram") {
    // Only import at runtime to avoid requiring Telegram credentials during build
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TelegramStorageService } = require("./telegram");
    _adapter = new TelegramStorageService();
  } else {
    _adapter = new MockStorageAdapter();
  }

  return _adapter!;
}

/** For testing: inject a custom adapter */
export function setStorageAdapter(adapter: StorageAdapter): void {
  _adapter = adapter;
}

export type { StorageAdapter } from "./adapter";
export type { UploadResult } from "./adapter";
