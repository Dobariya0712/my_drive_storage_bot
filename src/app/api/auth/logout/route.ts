// src/app/api/auth/logout/route.ts
// POST /api/auth/logout

import { apiSuccess, handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth/session";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();
    return apiSuccess({ message: "Logged out successfully" });
  } catch (err) {
    return handleApiError(err);
  }
}
