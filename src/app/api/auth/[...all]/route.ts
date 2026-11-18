import { toNextJsHandler } from "better-auth/next-js";

import { withProtectedHeaders } from "@/lib/admin-guard";
import { jsonResponse } from "@/lib/api-response";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { logServerError } from "@/lib/log";

export const runtime = "nodejs";

/**
 * Better Auth endpoints (email sign-in, sign-out, session). Public
 * sign-up is disabled in lib/auth.ts, and the admin plugin's user management
 * endpoints require permissions no role has (see lib/auth-roles.ts).
 * Responses are never cached or indexed.
 */
function handler(method: "GET" | "POST") {
  return async (request: Request) => {
    if (!isAuthConfigured()) {
      return withProtectedHeaders(
        jsonResponse({ ok: false, message: "Sign-in is not available yet." }, 503),
      );
    }
    try {
      return withProtectedHeaders(await toNextJsHandler(getAuth())[method](request));
    } catch (error) {
      // E.g. the database is unreachable or the auth tables are missing. Answer with a
      // generic, uncached 503 instead of letting the framework return a bare 500.
      logServerError("auth", "Auth request failed", error);
      return withProtectedHeaders(
        jsonResponse({ ok: false, message: "Sign-in is not available right now." }, 503),
      );
    }
  };
}

export const GET = handler("GET");
export const POST = handler("POST");
