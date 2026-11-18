/**
 * Browser-side helper for the admin JSON API. Turns every outcome (success,
 * a JSON error, an HTML error page, a network failure) into one small result,
 * so components never deal with raw responses and never show technical detail.
 * Only the server's own `message` is shown, and our API messages are generic.
 */

export const NETWORK_ERROR = "We could not reach the server. Check your connection and try again.";
export const UNEXPECTED_ERROR = "Something went wrong. Please try again.";
export const SESSION_ENDED = "Your session has ended. Please sign in again.";

export type AdminFetchResult =
  | { kind: "ok"; status: number; body: Record<string, unknown> }
  | { kind: "error"; status: number; message: string; code?: string }
  /** The request never got an answer (offline, blocked). */
  | { kind: "network"; message: string };

export async function adminFetch(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
): Promise<AdminFetchResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { kind: "network", message: NETWORK_ERROR };
  }

  let parsed: Record<string, unknown> = {};
  try {
    const json: unknown = await response.json();
    if (json && typeof json === "object") parsed = json as Record<string, unknown>;
  } catch {
    // Not JSON (an HTML error page, an empty body): handled by the status below.
  }

  if (response.ok && parsed.ok === true)
    return { kind: "ok", status: response.status, body: parsed };

  const code = typeof parsed.code === "string" ? parsed.code : undefined;
  if (response.status === 401) {
    return { kind: "error", status: 401, message: SESSION_ENDED, code };
  }
  const message =
    typeof parsed.message === "string" && parsed.message ? parsed.message : UNEXPECTED_ERROR;
  return { kind: "error", status: response.status, message, code };
}

export type AuthFetchResult =
  | { ok: true }
  | { ok: false; status: number; code?: string }
  | { ok: false; status: 0; network: true };

/**
 * Calls one of Better Auth's own endpoints (under /api/auth) with a JSON body.
 * Used for password change and sign out everywhere, where Better Auth does the
 * work, checks the origin and applies its rate limits. Its response shape is
 * not ours, so only the status and error `code` are read; no message text from
 * the response is ever shown. Passwords in `body` are sent, never stored or logged.
 */
export async function authFetch(path: string, body: unknown): Promise<AuthFetchResult> {
  let response: Response;
  try {
    response = await fetch(`/api/auth${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, network: true };
  }
  if (response.ok) return { ok: true };
  let code: string | undefined;
  try {
    const json = (await response.json()) as { code?: unknown };
    if (typeof json.code === "string") code = json.code;
  } catch {
    // Not JSON: the status alone is enough.
  }
  return { ok: false, status: response.status, code };
}
