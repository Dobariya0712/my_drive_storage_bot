// src/lib/api.ts
// Server-side API helpers: response builders and error handler

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiResponse } from "@/types";

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  const body: ApiResponse<T> = { success: true, data };
  return NextResponse.json(body, { status });
}

export function apiError(message: string, status = 400, details?: unknown): NextResponse {
  const body: ApiResponse = { success: false, error: message, details };
  return NextResponse.json(body, { status });
}

export function handleApiError(err: unknown): NextResponse {
  console.error("[API Error]", err);
  if (err instanceof ZodError) {
    return apiError("Validation failed", 400, err.flatten());
  }
  if (err instanceof Error) {
    if (err.message === "UNAUTHORIZED") {
      return apiError("Unauthorized", 401);
    }
    if (err.message === "FORBIDDEN") {
      return apiError("Forbidden", 403);
    }
    if (err.message === "NOT_FOUND") {
      return apiError("Not found", 404);
    }
    const cause = (err as any).cause;
    const causeMsg = cause?.message || (typeof cause === "string" ? cause : (cause ? JSON.stringify(cause) : ""));
    const fullMsg = causeMsg ? `${err.message} [Cause: ${causeMsg}]` : (err.message || "An error occurred");
    return apiError(fullMsg, 500, { cause: causeMsg });
  }
  return apiError("An unexpected error occurred", 500);
}

/** Simple in-memory rate limiter per IP address */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (existing.count >= maxRequests) {
    return false; // rate limited
  }

  existing.count++;
  return true; // allowed
}
