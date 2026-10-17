// src/lib/auth/password.ts
// Serverless-safe password hashing helpers using crypto.scrypt with argon2 fallback

import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Dynamically attempt argon2 import if native addon is supported
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let argon2Module: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  argon2Module = require("argon2");
} catch {
  // Native binary not available in serverless bundle
}

export async function hashPassword(password: string): Promise<string> {
  // Pure Node.js crypto scrypt: zero native C++ addon dependencies, 100% serverless safe across all environments
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    if (hash.startsWith("scrypt:")) {
      const parts = hash.split(":");
      if (parts.length !== 3) return false;
      const [, salt, key] = parts;
      const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
      const keyBuffer = Buffer.from(key, "hex");
      if (derivedKey.length !== keyBuffer.length) return false;
      return timingSafeEqual(derivedKey, keyBuffer);
    }

    if (argon2Module) {
      return await argon2Module.verify(hash, password);
    }

    return false;
  } catch (err) {
    console.error("verifyPassword error:", err);
    return false;
  }
}

