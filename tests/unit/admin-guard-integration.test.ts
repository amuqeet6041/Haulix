// @vitest-environment node
import { memoryAdapter } from "better-auth/adapters/memory";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { withAdmin, type SessionLike } from "@/lib/admin-guard";
import { createAuth } from "@/lib/auth";

/**
 * End-to-end authorization: real Better Auth (lib/auth.ts config) on the
 * in-memory adapter, real email + password sign-in, and probe routes protected
 * by withAdmin(). No mocks of the session logic.
 */

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = "admin@haulix.test";
const PASSWORD = "Correct-Horse-42!";

type Row = Record<string, unknown>;

class CookieJar {
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

function setup() {
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
  const guardOptions = {
    getSession: async (headers: Headers) =>
      (await auth.api.getSession({ headers })) as SessionLike | null,
    isConfigured: () => true,
  };
  const probe = withAdmin(
    { lead: ["list"] },
    async (_request, admin) => Response.json({ ok: true, admin }),
    guardOptions,
  );

  async function call(path: string, body: unknown, jar?: CookieJar) {
    const response = await auth.handler(
      new Request(`${BASE}/api/auth${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: BASE,
          ...(jar ? { Cookie: jar.header() } : {}),
        },
        body: JSON.stringify(body),
      }),
    );
    jar?.store(response);
    return response;
  }

  async function probeWith(cookie: string, method = "GET") {
    return probe(
      new Request(`${BASE}/api/admin/probe`, {
        method,
        headers: { ...(cookie ? { Cookie: cookie } : {}), Origin: BASE },
      }),
      {},
    );
  }

  async function createUser(email: string, role: "admin" | "carrier") {
    return auth.api.createUser({ body: { email, password: PASSWORD, name: "Person", role } });
  }

  async function signIn(email: string, password = PASSWORD) {
    const jar = new CookieJar();
    const response = await call("/sign-in/email", { email, password }, jar);
    return { jar, response };
  }

  return { auth, db, call, probeWith, createUser, signIn, guardOptions };
}

beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-test-secret-test-secret-123");
  vi.stubEnv("BETTER_AUTH_URL", BASE);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", BASE);
  vi.stubEnv("ADMIN_EMAILS", ADMIN_EMAIL);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("admin authorization end to end (email + password)", () => {
  it("allows an allowlisted admin after a password sign-in", async () => {
    const { probeWith, createUser, signIn } = setup();
    await createUser(ADMIN_EMAIL, "admin");
    const { jar, response } = await signIn(ADMIN_EMAIL);
    expect(response.status).toBe(200);

    const result = await probeWith(jar.header());
    expect(result.status).toBe(200);
    const body = (await result.json()) as { admin: Record<string, unknown> };
    expect(body.admin).toMatchObject({ email: ADMIN_EMAIL });
    expect(JSON.stringify(body)).not.toMatch(/token|password|secret/i);
    expect(result.headers.get("Cache-Control")).toContain("no-store");
  });

  it("refuses requests without a session", async () => {
    const { probeWith } = setup();
    expect((await probeWith("")).status).toBe(401);
  });

  it("gives no session for a wrong password", async () => {
    const { probeWith, createUser, signIn } = setup();
    await createUser(ADMIN_EMAIL, "admin");
    const { jar, response } = await signIn(ADMIN_EMAIL, "Wrong-Password-1!");
    expect(response.ok).toBe(false);
    expect((await probeWith(jar.header())).status).toBe(401);
  });

  it("answers an unknown email exactly like a wrong password", async () => {
    const { createUser, signIn } = setup();
    await createUser(ADMIN_EMAIL, "admin");
    const wrongPassword = await signIn(ADMIN_EMAIL, "Wrong-Password-1!");
    const unknownEmail = await signIn("nobody@haulix.test", "Wrong-Password-1!");
    expect(unknownEmail.response.status).toBe(wrongPassword.response.status);
    expect(await unknownEmail.response.json()).toEqual(await wrongPassword.response.json());
  });

  it("refuses forged or tampered session cookies (direct API bypass attempts)", async () => {
    const { probeWith, createUser, signIn } = setup();
    await createUser(ADMIN_EMAIL, "admin");
    const { jar } = await signIn(ADMIN_EMAIL);
    const real = jar.header();

    for (const cookie of [
      "haulix.session_token=forged-token",
      "haulix.session_token=",
      real.replace(/session_token=([^.;]+)/, "session_token=$1x"),
      "better-auth.session_token=forged",
    ]) {
      expect((await probeWith(cookie)).status).toBe(401);
    }
  });

  it("refuses carrier accounts", async () => {
    const { probeWith, createUser, signIn } = setup();
    await createUser("carrier@example.com", "carrier");
    const { jar } = await signIn("carrier@example.com");

    const response = await probeWith(jar.header());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "forbidden" });
  });

  it("refuses an admin removed from ADMIN_EMAILS, on the very next request", async () => {
    const { probeWith, createUser, signIn } = setup();
    await createUser(ADMIN_EMAIL, "admin");
    const { jar } = await signIn(ADMIN_EMAIL);
    expect((await probeWith(jar.header())).status).toBe(200);

    vi.stubEnv("ADMIN_EMAILS", "someone-else@haulix.test");
    expect((await probeWith(jar.header())).status).toBe(403);
  });

  it("refuses a banned admin", async () => {
    const { probeWith, createUser, signIn, db } = setup();
    await createUser(ADMIN_EMAIL, "admin");
    const { jar } = await signIn(ADMIN_EMAIL);
    for (const row of db.user!) row.banned = true;
    expect((await probeWith(jar.header())).status).toBe(403);
  });

  it("refuses expired and signed-out sessions", async () => {
    const { probeWith, createUser, signIn, db, call } = setup();
    await createUser(ADMIN_EMAIL, "admin");
    const first = await signIn(ADMIN_EMAIL);
    expect((await probeWith(first.jar.header())).status).toBe(200);

    for (const row of db.session!) row.expiresAt = new Date(Date.now() - 1000);
    expect((await probeWith(first.jar.header())).status).toBe(401);

    const second = await signIn(ADMIN_EMAIL);
    const cookie = second.jar.header();
    expect((await probeWith(cookie)).status).toBe(200);
    await call("/sign-out", {}, second.jar);
    expect((await probeWith(cookie)).status).toBe(401);
  });

  it("refuses a state-changing request from another origin even with a valid admin session", async () => {
    const { createUser, signIn, guardOptions } = setup();
    await createUser(ADMIN_EMAIL, "admin");
    const { jar } = await signIn(ADMIN_EMAIL);

    const handler = vi.fn(async () => Response.json({ ok: true }));
    const route = withAdmin({ lead: ["update-status"] }, handler, guardOptions);
    const response = await route(
      new Request(`${BASE}/api/admin/probe`, {
        method: "POST",
        headers: { Cookie: jar.header(), Origin: "https://evil.test" },
      }),
      {},
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("keeps public registration disabled and exposes no two-factor endpoints", async () => {
    const { call, db } = setup();
    const signUp = await call("/sign-up/email", {
      email: "new@example.com",
      password: PASSWORD,
      name: "New",
    });
    expect(signUp.ok).toBe(false);
    expect(db.user).toHaveLength(0);

    const enable = await call("/two-factor/enable", { password: PASSWORD });
    expect(enable.status).toBe(404);
  });
});
