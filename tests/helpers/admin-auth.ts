import { memoryAdapter } from "better-auth/adapters/memory";
import { vi } from "vitest";

import type { SessionLike } from "@/lib/admin-guard";
import { createAuth } from "@/lib/auth";

/**
 * Shared test setup for anything behind admin auth: the real Better Auth
 * configuration (lib/auth.ts) on the in-memory adapter, real email + password
 * sign-in, and a cookie jar that follows Set-Cookie like a browser.
 *
 * Use in node-environment tests only (`// @vitest-environment node`).
 */

export const TEST_BASE = "http://localhost:3000";
export const TEST_PASSWORD = "Correct-Horse-42!";
export const TEST_SECRET = "test-secret-test-secret-test-secret-123";

type Row = Record<string, unknown>;

/** Minimal browser-like cookie store: keeps cookies, drops expired ones. */
export class CookieJar {
  private cookies = new Map<string, string>();

  store(response: Response) {
    for (const raw of response.headers.getSetCookie()) {
      const [pair, ...attributes] = raw.split(";");
      const index = pair!.indexOf("=");
      const name = pair!.slice(0, index).trim();
      const value = pair!.slice(index + 1).trim();
      const expired = attributes.some((a) => /max-age=0/i.test(a)) || value === "";
      if (expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  header() {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

/**
 * Stubs the env vars Better Auth and the admin guard read, and silences the
 * guard's warning and error logs. Call in beforeEach; pair with
 * `vi.unstubAllEnvs()` and `vi.restoreAllMocks()` in afterEach.
 */
export function stubAuthEnv({
  adminEmails,
  baseUrl = TEST_BASE,
}: {
  adminEmails: string;
  baseUrl?: string;
}) {
  vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
  vi.stubEnv("BETTER_AUTH_URL", baseUrl);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", baseUrl);
  vi.stubEnv("ADMIN_EMAILS", adminEmails);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
}

type CookieSource = CookieJar | string | undefined;

function cookieHeader(source: CookieSource): Record<string, string> {
  const value = typeof source === "string" ? source : source?.header();
  return value ? { Cookie: value } : {};
}

/** Builds a same-origin POST to /api/auth{path}. */
export function authRequest(path: string, body: unknown, cookies?: CookieSource): Request {
  return new Request(`${TEST_BASE}/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: TEST_BASE, ...cookieHeader(cookies) },
    body: JSON.stringify(body),
  });
}

/** A fresh in-memory Better Auth instance plus helpers to drive it. */
export function createTestAuth() {
  const db: Record<string, Row[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
    rateLimit: [],
  };
  const auth = createAuth({
    database: memoryAdapter(db),
    findUserForSession: async (id) => {
      const user = db.user!.find((row) => row.id === id);
      return user ? { role: (user.role as string) ?? null, email: user.email as string } : null;
    },
  });

  /** Options for requireAdmin / withAdmin that use this auth instance. */
  const guardOptions = {
    getSession: async (headers: Headers) =>
      (await auth.api.getSession({ headers })) as SessionLike | null,
    isConfigured: () => true,
  };

  /** Sends a request to Better Auth's handler; a jar keeps the cookies it sets. */
  async function authPost(path: string, body: unknown, jar?: CookieJar) {
    const response = await auth.handler(authRequest(path, body, jar));
    jar?.store(response);
    return response;
  }

  function createUser(email: string, role: "admin" | "carrier", name = "Person") {
    return auth.api.createUser({ body: { email, password: TEST_PASSWORD, name, role } });
  }

  async function signIn(email: string, password = TEST_PASSWORD) {
    const jar = new CookieJar();
    const response = await authPost("/sign-in/email", { email, password }, jar);
    return { jar, response };
  }

  /** Creates an admin and signs it in, returning its cookie jar. */
  async function signedInAdmin(email: string) {
    await createUser(email, "admin");
    const { jar, response } = await signIn(email);
    if (!response.ok) throw new Error(`Test admin sign-in failed with ${response.status}.`);
    return jar;
  }

  return { auth, db, guardOptions, authPost, createUser, signIn, signedInAdmin };
}

export type TestAuth = ReturnType<typeof createTestAuth>;

/** Builds a request to an admin route, same-origin by default. */
export function adminRequest(
  path: string,
  {
    method = "GET",
    cookies,
    origin = TEST_BASE,
    body,
  }: { method?: string; cookies?: CookieSource; origin?: string | null; body?: unknown } = {},
): Request {
  const headers: Record<string, string> = { ...cookieHeader(cookies) };
  if (origin) headers.Origin = origin;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return new Request(`${TEST_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}
