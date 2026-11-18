import { NextResponse } from "next/server";

import { isAllowlistedAdmin } from "@/lib/admin-allowlist";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { ADMIN_ROLE, roles, type statements } from "@/lib/auth-roles";
import { logServerError, logServerWarning } from "@/lib/log";
import { checkOrigin } from "@/lib/request-guard";

/**
 * Server-side admin authorization. Server only.
 *
 * Every protected admin route handler calls `requireAdmin()` (or uses
 * `withAdmin()`), and every admin service calls `assertAdmin()` on the
 * context it receives. `src/proxy.ts` only adds an early, cookie-presence
 * check; it is never the authority.
 *
 * Admin access requires ALL of:
 *   1. a valid, unexpired Better Auth session (verified server-side),
 *   2. role "admin" (carriers and any other role are refused),
 *   3. the user's email in ADMIN_EMAILS (checked on every request),
 *   4. not banned, and not an impersonation session,
 *   5. the specific permission the endpoint needs (lib/auth-roles.ts).
 *
 * Authentication is email + password. Two-factor (TOTP) is postponed: to
 * reintroduce it, load Better Auth's twoFactor plugin in lib/auth.ts and add a
 * `twoFactorEnabled === true` check (with its own denial) after the ban check.
 */

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

/** Headers for every auth-protected response: never cached, never indexed. */
export const PROTECTED_RESPONSE_HEADERS: Readonly<Record<string, string>> = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "X-Robots-Tag": "noindex, nofollow",
};

export function withProtectedHeaders<T extends Response>(response: T): T {
  for (const [name, value] of Object.entries(PROTECTED_RESPONSE_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

/**
 * Public denial codes. Deliberately coarse: a caller learns whether to sign
 * in or that access is refused, but not which rule (role, allowlist, ban)
 * refused it.
 */
export type AdminDenial = "unauthenticated" | "forbidden" | "unavailable";

const DENIALS: Record<AdminDenial, { status: number; message: string }> = {
  unauthenticated: { status: 401, message: "Please sign in to continue." },
  forbidden: { status: 403, message: "You do not have access to this area." },
  unavailable: {
    status: 503,
    message: "Sign-in is not available right now. Please try again later.",
  },
};

export function denialResponse(denial: AdminDenial): NextResponse {
  const { status, message } = DENIALS[denial];
  const response = NextResponse.json({ ok: false, code: denial, message }, { status });
  if (denial === "unauthenticated")
    response.headers.set("WWW-Authenticate", 'Session realm="admin"');
  return withProtectedHeaders(response);
}

// ---------------------------------------------------------------------------
// Session evaluation
// ---------------------------------------------------------------------------

/** The parts of a Better Auth session the guard reads. Never includes the token. */
export interface SessionLike {
  session: {
    id: string;
    userId: string;
    expiresAt: Date | string;
    impersonatedBy?: string | null;
  };
  user: {
    id: string;
    email: string;
    name: string;
    role?: string | null;
    banned?: boolean | null;
    banExpires?: Date | string | null;
  };
}

/** Internal reason, logged with the user id only (never shown to the caller). */
export type DenialReason =
  "no_session" | "expired_session" | "not_admin" | "not_allowlisted" | "banned" | "impersonated";

declare const adminContextBrand: unique symbol;

/**
 * Proof that `requireAdmin()` authorized this request. Only this module can
 * create one; services accept nothing else as an actor.
 */
export interface AdminContext {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly sessionId: string;
  readonly [adminContextBrand]: true;
}

const issuedContexts = new WeakSet<object>();

function issueContext(session: SessionLike): AdminContext {
  const context = Object.freeze({
    userId: session.user.id,
    email: session.user.email.toLowerCase(),
    name: session.user.name,
    sessionId: session.session.id,
  }) as AdminContext;
  issuedContexts.add(context);
  return context;
}

function isBanned(user: SessionLike["user"], now: Date): boolean {
  if (!user.banned) return false;
  if (!user.banExpires) return true;
  return new Date(user.banExpires).getTime() > now.getTime();
}

export type AdminEvaluation =
  { ok: true; admin: AdminContext } | { ok: false; denial: AdminDenial; reason: DenialReason };

/** Pure decision for a session (or its absence). Order matters; see module docs. */
export function evaluateAdminSession(
  session: SessionLike | null | undefined,
  now: Date = new Date(),
): AdminEvaluation {
  if (!session?.session || !session.user) {
    return { ok: false, denial: "unauthenticated", reason: "no_session" };
  }
  if (new Date(session.session.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, denial: "unauthenticated", reason: "expired_session" };
  }
  if (session.user.role !== ADMIN_ROLE) {
    return { ok: false, denial: "forbidden", reason: "not_admin" };
  }
  if (!isAllowlistedAdmin(session.user.email)) {
    return { ok: false, denial: "forbidden", reason: "not_allowlisted" };
  }
  if (isBanned(session.user, now)) {
    return { ok: false, denial: "forbidden", reason: "banned" };
  }
  if (session.session.impersonatedBy) {
    return { ok: false, denial: "forbidden", reason: "impersonated" };
  }
  return { ok: true, admin: issueContext(session) };
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

type Statements = typeof statements;
export type AdminPermissions = { [K in keyof Statements]?: Statements[K][number][] };

export function adminHasPermission(permissions: AdminPermissions): boolean {
  return roles[ADMIN_ROLE].authorize(permissions).success;
}

/** True when a permission set actually names something to check ({} means "admin only"). */
function requestsPermissions(
  permissions: AdminPermissions | undefined,
): permissions is AdminPermissions {
  return Boolean(
    permissions && Object.values(permissions).some((actions) => actions && actions.length > 0),
  );
}

export class AdminAccessError extends Error {
  constructor(public readonly denial: AdminDenial) {
    super(DENIALS[denial].message);
    this.name = "AdminAccessError";
  }
}

/**
 * Service-level check. Call at the top of every admin service function with
 * the context from `requireAdmin()` and the permission the operation needs.
 * Re-checks the allowlist so a revocation takes effect immediately.
 */
export function assertAdmin(
  context: unknown,
  permissions?: AdminPermissions,
): asserts context is AdminContext {
  if (!context || typeof context !== "object" || !issuedContexts.has(context)) {
    throw new AdminAccessError("unauthenticated");
  }
  const admin = context as AdminContext;
  if (!isAllowlistedAdmin(admin.email)) throw new AdminAccessError("forbidden");
  if (requestsPermissions(permissions) && !adminHasPermission(permissions))
    throw new AdminAccessError("forbidden");
}

// ---------------------------------------------------------------------------
// Request guard
// ---------------------------------------------------------------------------

type GetSession = (headers: Headers) => Promise<SessionLike | null>;

const betterAuthSession: GetSession = async (headers) =>
  (await getAuth().api.getSession({ headers })) as SessionLike | null;

export interface RequireAdminOptions {
  /** Permission the endpoint needs, checked after the session. */
  permissions?: AdminPermissions;
  /** Injectable for tests. Defaults to Better Auth's server-side getSession. */
  getSession?: GetSession;
  /** Injectable for tests. Defaults to checking DATABASE_URL and BETTER_AUTH_SECRET. */
  isConfigured?: () => boolean;
}

export type RequireAdminResult =
  { ok: true; admin: AdminContext } | { ok: false; response: NextResponse };

export type AdminCheck = { ok: true; admin: AdminContext } | { ok: false; denial: AdminDenial };

/**
 * Verifies the session in `headers` with Better Auth (server-side lookup of
 * the session token in the database, including expiry) and applies every
 * admin rule and the optional permission. Never throws. Shared by API routes
 * (`requireAdmin`) and server-rendered admin pages (`app/admin/(protected)`).
 */
export async function checkAdmin(
  headers: Headers,
  {
    permissions,
    getSession = betterAuthSession,
    isConfigured = isAuthConfigured,
  }: RequireAdminOptions = {},
): Promise<AdminCheck> {
  if (!isConfigured()) return { ok: false, denial: "unavailable" };

  let session: SessionLike | null;
  try {
    session = await getSession(headers);
  } catch (error) {
    logServerError("admin-guard", "Session lookup failed", error);
    return { ok: false, denial: "unavailable" };
  }

  const result = evaluateAdminSession(session);
  if (!result.ok) {
    if (result.reason !== "no_session") {
      logServerWarning(
        "admin-guard",
        `Denied admin access (${result.reason}) for user ${session?.user?.id ?? "unknown"}.`,
      );
    }
    return { ok: false, denial: result.denial };
  }
  if (requestsPermissions(permissions) && !adminHasPermission(permissions)) {
    logServerWarning("admin-guard", `Denied a permission to user ${result.admin.userId}.`);
    return { ok: false, denial: "forbidden" };
  }
  return { ok: true, admin: result.admin };
}

/** API-route form of `checkAdmin`: failures become a ready 401, 403 or 503 response. */
export async function requireAdmin(
  request: Request,
  options: RequireAdminOptions = {},
): Promise<RequireAdminResult> {
  const result = await checkAdmin(request.headers, options);
  return result.ok ? result : { ok: false, response: denialResponse(result.denial) };
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type AdminHandler<C> = (request: Request, admin: AdminContext, context: C) => Promise<Response>;

/**
 * Wraps an admin route handler: same-origin check for state-changing methods,
 * `requireAdmin()` with the given permission, `AdminAccessError` from services
 * turned into the right response, and no-cache headers on every response.
 */
export function withAdmin<C = unknown>(
  permissions: AdminPermissions,
  handler: AdminHandler<C>,
  options: Omit<RequireAdminOptions, "permissions"> = {},
) {
  return async (request: Request, context: C): Promise<Response> => {
    if (!SAFE_METHODS.has(request.method.toUpperCase())) {
      const blocked = checkOrigin(request);
      if (blocked) return withProtectedHeaders(blocked);
    }
    const guard = await requireAdmin(request, { ...options, permissions });
    if (!guard.ok) return guard.response;
    try {
      return withProtectedHeaders(await handler(request, guard.admin, context));
    } catch (error) {
      if (error instanceof AdminAccessError) return denialResponse(error.denial);
      logServerError("admin", "Admin request failed", error);
      return withProtectedHeaders(
        NextResponse.json(
          { ok: false, message: "Something went wrong on our side. Please try again." },
          { status: 500 },
        ),
      );
    }
  };
}
