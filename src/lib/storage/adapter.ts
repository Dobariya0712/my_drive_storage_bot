// src/lib/storage/adapter.ts
// Storage adapter interface — lets us swap Telegram for mock during testing

export interface UploadResult {
  telegramFileId: string;
  telegramMessageId: number;
  telegramChatId: string;
}

export interface StorageAdapter {
  /**
   * Upload a file buffer to the storage backend.
   * @param buffer   Raw file bytes
   * @param filename Original filename (used in Telegram caption)
   * @param mimeType MIME type
   * @returns Telegram storage identifiers
   */
  uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult>;

  /**
   * Retrieve a file's download URL or buffer.
   * Returns a URL that the server can stream from.
   */
  getFileUrl(telegramFileId: string): Promise<string>;

  /**
   * Delete a file from the storage backend.
   * Returns true if successful, false if not supported or already gone.
   */
  deleteFile(
    telegramMessageId: number,
    telegramChatId: string
  ): Promise<boolean>;
}
