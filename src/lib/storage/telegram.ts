// src/lib/storage/telegram.ts
// Telegram Bot API storage adapter
// Bot API limits:
//   - sendDocument upload: max 50 MB
//   - getFile download URL: files up to 20 MB only
//   - Files 20–50 MB: download via https://api.telegram.org/file/bot<token>/<file_path>

import { StorageAdapter, UploadResult } from "./adapter";

const MAX_UPLOAD_BYTES = parseInt(process.env.MAX_FILE_SIZE_BYTES || "2147483648", 10); // 2 GB

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: {
    retry_after?: number;
  };
}

interface TelegramMessage {
  message_id: number;
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
}

interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export class TelegramStorageService implements StorageAdapter {
  private chatId: string;
  private botToken: string;
  private apiBase: string;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      throw new Error(
        "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in environment variables."
      );
    }

    this.botToken = token;
    this.chatId = chatId;
    this.apiBase = (process.env.TELEGRAM_API_URL || "https://api.telegram.org").replace(/\/$/, "");
  }

  /**
   * Upload a file buffer to the private Telegram channel.
   * Enforces the MAX_UPLOAD_BYTES limit (2 GB).
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new Error(
        `File exceeds the ${(MAX_UPLOAD_BYTES / (1024 * 1024 * 1024)).toFixed(0)} GB upload limit. Size: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`
      );
    }

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const formData = new FormData();
        formData.append("chat_id", this.chatId);
        formData.append("caption", `TeleCloud upload: ${filename}`);
        
        // Convert Node Buffer to Uint8Array/Blob for web FormData
        const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
        formData.append("document", blob, filename);

        const res = await fetch(
          `${this.apiBase}/bot${this.botToken}/sendDocument`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data: TelegramResponse<TelegramMessage> = await res.json();

        if (!data.ok || !data.result) {
          if (data.parameters?.retry_after) {
            const retryAfter = data.parameters.retry_after;
            console.warn(`Telegram rate limit hit. Retrying after ${retryAfter}s`);
            await sleep(retryAfter * 1000);
            continue;
          }
          throw new Error(data.description || `Telegram API error: ${data.error_code}`);
        }

        const doc = data.result.document;
        if (!doc) {
          throw new Error("Telegram did not return a document object.");
        }

        return {
          telegramFileId: doc.file_id,
          telegramMessageId: data.result.message_id,
          telegramChatId: this.chatId,
        };
      } catch (err: unknown) {
        attempt++;
        const errMsg = err instanceof Error ? err.message : String(err);

        // Respect Telegram rate limits (429)
        if (errMsg.includes("429") || errMsg.includes("Too Many Requests")) {
          const retryAfter = this.parseRetryAfter(errMsg);
          console.warn(`Telegram rate limit hit. Retrying after ${retryAfter}s`);
          await sleep(retryAfter * 1000);
          continue;
        }

        if (attempt >= maxRetries) {
          throw new Error(`Telegram upload failed after ${maxRetries} attempts: ${errMsg}`);
        }

        await sleep(1000 * attempt); // exponential backoff
      }
    }

    throw new Error("Telegram upload failed: max retries exceeded");
  }

  /**
   * Get a download URL for a file stored in Telegram.
   */
  async getFileUrl(telegramFileId: string): Promise<string> {
    const res = await fetch(
      `${this.apiBase}/bot${this.botToken}/getFile?file_id=${encodeURIComponent(telegramFileId)}`
    );

    const data: TelegramResponse<TelegramFile> = await res.json();

    if (!data.ok || !data.result?.file_path) {
      throw new Error(
        `Telegram did not return a file_path: ${data.description || telegramFileId}`
      );
    }

    // For all files (bot API provides path)
    // The token is embedded server-side — never sent directly to untrusted client
    return `${this.apiBase}/file/bot${this.botToken}/${data.result.file_path}`;
  }

  /**
   * Delete a message (and its file) from the private channel.
   */
  async deleteFile(
    telegramMessageId: number,
    telegramChatId: string
  ): Promise<boolean> {
    try {
      const res = await fetch(
        `${this.apiBase}/bot${this.botToken}/deleteMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: telegramChatId,
            message_id: telegramMessageId,
          }),
        }
      );

      const data: TelegramResponse<boolean> = await res.json();
      return Boolean(data.ok && data.result);
    } catch (err) {
      console.warn("Telegram deleteMessage failed (non-fatal):", err);
      return false;
    }
  }

  private parseRetryAfter(errMsg: string): number {
    const match = errMsg.match(/retry after (\d+)/i);
    return match ? parseInt(match[1], 10) : 5;
  }
}
