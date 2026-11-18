import { assertAdmin } from "@/lib/admin-guard";
import { getAuth } from "@/lib/auth";
import { describeDevice } from "@/lib/device-label";
import { logServerError } from "@/lib/log";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { AccountProfile, AccountSession } from "@/types/account";
import type { AccountProfileInput } from "@/validations/admin-account";

/**
 * The signed-in admin's own account. Server only.
 *
 * Everything goes through Better Auth's own API and is scoped to the caller:
 * the user id always comes from the verified admin context, and sessions are
 * listed and revoked through the caller's own cookie, so one admin can never
 * see or end another admin's sessions. Passwords never pass through here
 * (the browser talks to Better Auth's change-password endpoint directly), and
 * session tokens are read only to compare sessions and are never returned.
 */

export type AccountResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not_configured" | "not_found" | "current_session" | "failed" };

/** Reads the profile fields the page shows (never the password or tokens). */
export async function getAccountProfile(admin: unknown): Promise<AccountResult<AccountProfile>> {
  assertAdmin(admin);
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };
  try {
    const user = await getPrisma().user.findUnique({
      where: { id: admin.userId },
      select: { name: true, email: true, role: true, createdAt: true },
    });
    if (!user) return { ok: false, reason: "not_found" };
    return {
      ok: true,
      data: {
        name: user.name,
        email: user.email,
        role: user.role ?? "admin",
        memberSince: user.createdAt.toISOString(),
      },
    };
  } catch (error) {
    logServerError("admin-account", "Failed to load the account", error);
    return { ok: false, reason: "failed" };
  }
}

/** Changes the display name. Better Auth validates the session and applies it to the caller only. */
export async function updateAccountName(
  admin: unknown,
  headers: Headers,
  input: AccountProfileInput,
): Promise<AccountResult<{ name: string }>> {
  assertAdmin(admin);
  try {
    await getAuth().api.updateUser({ headers, body: { name: input.name } });
    return { ok: true, data: { name: input.name } };
  } catch (error) {
    logServerError("admin-account", "Failed to update the name", error);
    return { ok: false, reason: "failed" };
  }
}

/** The caller's active sessions, newest activity first, with tokens and IPs left out. */
export async function listAccountSessions(
  admin: unknown,
  headers: Headers,
): Promise<AccountResult<AccountSession[]>> {
  assertAdmin(admin);
  try {
    const auth = getAuth();
    const [sessions, current] = await Promise.all([
      auth.api.listSessions({ headers }),
      auth.api.getSession({ headers }),
    ]);
    const currentToken = current?.session.token;
    const list = sessions
      .map((session) => ({
        id: session.id,
        current: session.token === currentToken,
        device: describeDevice(session.userAgent),
        createdAt: new Date(session.createdAt).toISOString(),
        lastActiveAt: new Date(session.updatedAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
      }))
      .sort(
        (a, b) =>
          Number(b.current) - Number(a.current) || b.lastActiveAt.localeCompare(a.lastActiveAt),
      );
    return { ok: true, data: list };
  } catch (error) {
    logServerError("admin-account", "Failed to list sessions", error);
    return { ok: false, reason: "failed" };
  }
}

/**
 * Ends one of the caller's other sessions. The session is found in the
 * caller's own list by its opaque id (so an id belonging to anyone else is
 * simply "not found"), and the current session is refused here: use sign out.
 */
export async function revokeAccountSession(
  admin: unknown,
  headers: Headers,
  sessionId: string,
): Promise<AccountResult<{ sessionId: string }>> {
  assertAdmin(admin);
  try {
    const auth = getAuth();
    const [sessions, current] = await Promise.all([
      auth.api.listSessions({ headers }),
      auth.api.getSession({ headers }),
    ]);
    const target = sessions.find((session) => session.id === sessionId);
    if (!target) return { ok: false, reason: "not_found" };
    if (target.token === current?.session.token) return { ok: false, reason: "current_session" };

    await auth.api.revokeSession({ headers, body: { token: target.token } });
    return { ok: true, data: { sessionId } };
  } catch (error) {
    logServerError("admin-account", "Failed to revoke a session", error);
    return { ok: false, reason: "failed" };
  }
}
