// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as revokeSession } from "@/app/api/admin/account/sessions/[id]/route";
import { GET as listSessions } from "@/app/api/admin/account/sessions/route";
import { PATCH as updateProfile } from "@/app/api/admin/account/profile/route";
import { withAdmin } from "@/lib/admin-guard";

import {
  adminRequest,
  createTestAuth,
  stubAuthEnv,
  TEST_PASSWORD,
  type CookieJar,
  type TestAuth,
} from "../helpers/admin-auth";

/**
 * The account routes and Better Auth's own account endpoints, end to end on the
 * REAL Better Auth configuration (in-memory adapter): real sign-ins, real
 * sessions, real password hashing.
 */

const holder = vi.hoisted(() => ({ auth: null as unknown }));

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAuth: () => (holder.auth as { auth: unknown }).auth,
  isAuthConfigured: () => true,
}));

const ALICE = "alice@haulix.test";
const BOB = "bob@haulix.test";
const NEW_PASSWORD = "A-Brand-New-Password-7";

let testAuth: TestAuth;

type Route = (request: Request, context: never) => Promise<Response>;
const call = (handler: unknown, request: Request, params: Record<string, string> = {}) =>
  (handler as Route)(request, { params: Promise.resolve(params) } as never);

/** A route protected the way every admin API route is, to see whether a cookie still works. */
const probe = (testAuth_: TestAuth) =>
  withAdmin({}, async () => Response.json({ ok: true }), testAuth_.guardOptions);
const works = async (jar: CookieJar) =>
  (await probe(testAuth)(adminRequest("/api/admin/me", { cookies: jar }), {})).status === 200;

const user = (email: string) => testAuth.db.user!.find((row) => row.email === email)!;

beforeEach(() => {
  stubAuthEnv({ adminEmails: `${ALICE},${BOB}` });
  testAuth = createTestAuth();
  holder.auth = testAuth;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe.each([
  [
    "PATCH profile",
    (c: unknown, o?: string | null) =>
      call(
        updateProfile,
        adminRequest("/api/admin/account/profile", {
          method: "PATCH",
          cookies: c as string,
          body: { name: "New" },
          origin: o,
        }),
      ),
  ],
  [
    "GET sessions",
    (c: unknown) =>
      call(listSessions, adminRequest("/api/admin/account/sessions", { cookies: c as string })),
  ],
  [
    "DELETE session",
    (c: unknown, o?: string | null) =>
      call(
        revokeSession,
        adminRequest("/api/admin/account/sessions/abc", {
          method: "DELETE",
          cookies: c as string,
          origin: o,
        }),
        { id: "abc" },
      ),
  ],
] as const)("%s: access control", (_name, run) => {
  it("answers 401 without a session or with a forged cookie", async () => {
    expect((await run(undefined)).status).toBe(401);
    expect((await run("haulix.session_token=forged")).status).toBe(401);
  });

  it("answers 403 for a carrier, an admin removed from the allowlist, and a banned admin", async () => {
    await testAuth.createUser("carrier@example.com", "carrier");
    expect((await run((await testAuth.signIn("carrier@example.com")).jar)).status).toBe(403);

    const jar = await testAuth.signedInAdmin(ALICE);
    vi.stubEnv("ADMIN_EMAILS", BOB);
    expect((await run(jar)).status).toBe(403);
    vi.stubEnv("ADMIN_EMAILS", `${ALICE},${BOB}`);
    for (const row of testAuth.db.user!) row.banned = true;
    expect((await run(jar)).status).toBe(403);
  });
});

describe("profile: PATCH /api/admin/account/profile", () => {
  const patch = (jar: unknown, body: unknown, origin?: string | null) =>
    call(
      updateProfile,
      adminRequest("/api/admin/account/profile", {
        method: "PATCH",
        cookies: jar as string,
        body,
        origin,
      }),
    );

  it("changes the display name, and returns only the name", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    const response = await patch(jar, { name: "  Alice Admin  " });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ ok: true, name: "Alice Admin" });
    expect(user(ALICE).name).toBe("Alice Admin");
  });

  it("changes only the caller's own account", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    await testAuth.createUser(BOB, "admin", "Bob Before");
    await patch(jar, { name: "Alice After" });
    expect(user(BOB).name).toBe("Bob Before");
  });

  it.each([
    ["an empty name", { name: "" }],
    ["a whitespace name", { name: "   " }],
    ["a name that is too long", { name: "x".repeat(101) }],
    ["no name", {}],
    ["a role", { name: "Alice", role: "admin" }],
    ["an email", { name: "Alice", email: "evil@example.com" }],
    ["a user id", { name: "Alice", userId: "someone-else" }],
    ["a non-string name", { name: 7 }],
  ])("answers 422 for %s and changes nothing", async (_name, body) => {
    const jar = await testAuth.signedInAdmin(ALICE);
    const before = JSON.stringify(user(ALICE));
    const response = await patch(jar, body);
    expect(response.status).toBe(422);
    expect(JSON.stringify(user(ALICE))).toBe(before);
  });

  it("answers 403 for another origin or none, and changes nothing", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    expect((await patch(jar, { name: "Hacked" }, "https://evil.test")).status).toBe(403);
    expect((await patch(jar, { name: "Hacked" }, null)).status).toBe(403);
    expect(user(ALICE).name).not.toBe("Hacked");
  });

  it("answers 400 for a body that is not JSON", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    expect((await patch(jar, "{nope")).status).toBe(400);
  });
});

describe("privileges cannot be changed through Better Auth's own endpoints either", () => {
  it("ignores or refuses a role in update-user, so nobody can promote themselves", async () => {
    await testAuth.createUser("carrier@example.com", "carrier");
    const { jar } = await testAuth.signIn("carrier@example.com");
    await testAuth.authPost("/update-user", { name: "Sneaky", role: "admin" }, jar);
    expect(user("carrier@example.com").role).toBe("carrier");

    const adminJar = await testAuth.signedInAdmin(ALICE);
    await testAuth.authPost("/update-user", { role: "carrier" }, adminJar);
    expect(user(ALICE).role).toBe("admin");
  });

  it("keeps email changes and account deletion disabled", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    const change = await testAuth.authPost("/change-email", { newEmail: "evil@example.com" }, jar);
    expect(change.ok).toBe(false);
    const remove = await testAuth.authPost("/delete-user", { password: TEST_PASSWORD }, jar);
    expect(remove.ok).toBe(false);
    expect(user(ALICE).email).toBe(ALICE);
    expect(testAuth.db.user).toHaveLength(1);
  });

  it("keeps public registration disabled", async () => {
    const response = await testAuth.authPost("/sign-up/email", {
      email: "new@haulix.test",
      password: TEST_PASSWORD,
      name: "New",
    });
    expect(response.ok).toBe(false);
    expect(testAuth.db.user).toHaveLength(0);
  });
});

describe("sessions: GET /api/admin/account/sessions", () => {
  const list = async (jar: unknown) =>
    (await (
      await call(
        listSessions,
        adminRequest("/api/admin/account/sessions", { cookies: jar as string }),
      )
    ).json()) as {
      sessions: { id: string; current: boolean; device: string }[];
    };

  it("lists the admin's own sessions and marks the current one", async () => {
    const first = await testAuth.signedInAdmin(ALICE);
    const second = (await testAuth.signIn(ALICE)).jar;
    const { sessions } = await list(second);

    expect(sessions).toHaveLength(2);
    expect(sessions.filter((s) => s.current)).toHaveLength(1);
    expect(sessions[0]!.current).toBe(true);
    // From the first browser's point of view the current one is the other session.
    const fromFirst = (await list(first)).sessions;
    expect(fromFirst.find((s) => s.current)!.id).not.toBe(sessions.find((s) => s.current)!.id);
  });

  it("never lists another admin's sessions", async () => {
    const alice = await testAuth.signedInAdmin(ALICE);
    await testAuth.signedInAdmin(BOB);
    const { sessions } = await list(alice);
    expect(sessions).toHaveLength(1);
  });

  it("returns no tokens, IP addresses, passwords or raw user agents", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    const response = await call(
      listSessions,
      adminRequest("/api/admin/account/sessions", { cookies: jar }),
    );
    const text = await response.text();
    const tokens = testAuth.db.session!.map((row) => String(row.token));
    for (const token of tokens) expect(text).not.toContain(token);
    expect(text).not.toMatch(/token|password|ipAddress|userAgent|secret/i);
    expect(Object.keys(JSON.parse(text).sessions[0]).sort()).toEqual([
      "createdAt",
      "current",
      "device",
      "expiresAt",
      "id",
      "lastActiveAt",
    ]);
  });
});

describe("sessions: DELETE /api/admin/account/sessions/[id]", () => {
  const revoke = (jar: unknown, id: string, origin?: string | null) =>
    call(
      revokeSession,
      adminRequest(`/api/admin/account/sessions/${id}`, {
        method: "DELETE",
        cookies: jar as string,
        origin,
      }),
      { id },
    );

  const idsFor = async (jar: unknown) =>
    (
      (await (
        await call(
          listSessions,
          adminRequest("/api/admin/account/sessions", { cookies: jar as string }),
        )
      ).json()) as {
        sessions: { id: string; current: boolean }[];
      }
    ).sessions;

  it("ends one of the admin's other sessions, and only that one", async () => {
    const laptop = await testAuth.signedInAdmin(ALICE);
    const phone = (await testAuth.signIn(ALICE)).jar;
    const target = (await idsFor(laptop)).find((s) => !s.current)!;

    const response = await revoke(laptop, target.id);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, sessionId: target.id });

    expect(await works(phone)).toBe(false);
    expect(await works(laptop)).toBe(true);
  });

  it("refuses to end the current session (use Sign out)", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    const current = (await idsFor(jar)).find((s) => s.current)!;
    const response = await revoke(jar, current.id);
    expect(response.status).toBe(400);
    expect(await works(jar)).toBe(true);
  });

  it("cannot end another admin's session: it is simply not found (no IDOR)", async () => {
    const alice = await testAuth.signedInAdmin(ALICE);
    const bob = await testAuth.signedInAdmin(BOB);
    const bobsSession = (await idsFor(bob))[0]!;

    expect((await revoke(alice, bobsSession.id)).status).toBe(404);
    expect(await works(bob)).toBe(true);
  });

  it.each(["unknown-id", "../../etc", "a b", "x".repeat(200), "%00"])(
    "answers 404 for the invalid or unknown id %s",
    async (id) => {
      const jar = await testAuth.signedInAdmin(ALICE);
      expect((await revoke(jar, id)).status).toBe(404);
      expect(await works(jar)).toBe(true);
    },
  );

  it("answers 403 for another origin, and ends nothing", async () => {
    const laptop = await testAuth.signedInAdmin(ALICE);
    const phone = (await testAuth.signIn(ALICE)).jar;
    const target = (await idsFor(laptop)).find((s) => !s.current)!;
    expect((await revoke(laptop, target.id, "https://evil.test")).status).toBe(403);
    expect(await works(phone)).toBe(true);
  });
});

describe("password change through Better Auth (the browser calls it directly)", () => {
  const change = (jar: CookieJar, body: Record<string, unknown>) =>
    testAuth.authPost("/change-password", body, jar);

  it("refuses an incorrect current password and changes nothing", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    const response = await change(jar, {
      currentPassword: "Wrong-Password-1!",
      newPassword: NEW_PASSWORD,
    });
    expect(response.ok).toBe(false);
    expect(((await response.json()) as { code: string }).code).toBe("INVALID_PASSWORD");

    expect((await testAuth.signIn(ALICE, TEST_PASSWORD)).response.ok).toBe(true);
    expect((await testAuth.signIn(ALICE, NEW_PASSWORD)).response.ok).toBe(false);
  });

  it("refuses a new password that is too short, or too long", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    expect((await change(jar, { currentPassword: TEST_PASSWORD, newPassword: "12345" })).ok).toBe(
      false,
    );
    expect(
      (await change(jar, { currentPassword: TEST_PASSWORD, newPassword: "x".repeat(129) })).ok,
    ).toBe(false);
    expect((await testAuth.signIn(ALICE, TEST_PASSWORD)).response.ok).toBe(true);
  });

  it("requires a signed-in session", async () => {
    const response = await testAuth.authPost("/change-password", {
      currentPassword: TEST_PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    expect(response.status).toBe(401);
  });

  it("changes the password: the old one stops working, the new one works, other devices are signed out", async () => {
    const laptop = await testAuth.signedInAdmin(ALICE);
    const phone = (await testAuth.signIn(ALICE)).jar;
    expect(await works(phone)).toBe(true);

    const response = await change(laptop, {
      currentPassword: TEST_PASSWORD,
      newPassword: NEW_PASSWORD,
      revokeOtherSessions: true,
    });
    expect(response.ok).toBe(true);
    // The response must not hand back the password or a hash.
    expect(JSON.stringify(await response.clone().json())).not.toMatch(new RegExp(NEW_PASSWORD));

    expect((await testAuth.signIn(ALICE, TEST_PASSWORD)).response.ok).toBe(false);
    expect((await testAuth.signIn(ALICE, NEW_PASSWORD)).response.ok).toBe(true);
    expect(await works(phone)).toBe(false);
    // This device stays signed in, on its refreshed cookie.
    expect(await works(laptop)).toBe(true);
  });

  it("stores only a hash, never the password", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    await change(jar, { currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD });
    const stored = JSON.stringify(testAuth.db.account);
    expect(stored).not.toContain(NEW_PASSWORD);
    expect(stored).not.toContain(TEST_PASSWORD);
  });

  it("has the same 5-attempts-per-15-minutes limit as sign-in configured for the change-password endpoint", () => {
    const rules = (
      testAuth.auth.options.rateLimit as {
        customRules: Record<string, { window: number; max: number }>;
      }
    ).customRules;
    expect(rules["/change-password"]).toEqual({ window: 900, max: 5 });
    expect(rules["/sign-in/email"]).toEqual({ window: 900, max: 5 });
  });
});

describe("sign out everywhere (Better Auth revoke-sessions)", () => {
  it("ends every session of the admin, including the current one, and not anyone else's", async () => {
    const laptop = await testAuth.signedInAdmin(ALICE);
    const phone = (await testAuth.signIn(ALICE)).jar;
    const bob = await testAuth.signedInAdmin(BOB);

    const response = await testAuth.authPost("/revoke-sessions", {}, laptop);
    expect(response.ok).toBe(true);

    expect(await works(laptop)).toBe(false);
    expect(await works(phone)).toBe(false);
    expect(await works(bob)).toBe(true);
    // The browser may keep the cookie, but it no longer matches any session: every
    // protected route and page checks the session on the server and refuses it.
  });

  it("requires a session", async () => {
    expect((await testAuth.authPost("/revoke-sessions", {})).status).toBe(401);
  });
});
