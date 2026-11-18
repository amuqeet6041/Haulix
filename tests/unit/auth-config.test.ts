// @vitest-environment node
import { memoryAdapter } from "better-auth/adapters/memory";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAuth } from "@/lib/auth";

/**
 * Runs the real Better Auth configuration (lib/auth.ts) against Better Auth's
 * in-memory adapter, so the rules are tested end to end without a database.
 */

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = "owner@haulix.test";
const PASSWORD = "Correct-Horse-42!";

type Row = Record<string, unknown>;

function setup() {
  const db: Record<string, Row[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
    twoFactor: [],
    rateLimit: [],
  };
  const auth = createAuth({
    database: memoryAdapter(db),
    findUserForSession: async (id) => {
      const user = db.user!.find((row) => row.id === id);
      return user ? { role: (user.role as string) ?? null, email: user.email as string } : null;
    },
  });
  return { auth, db };
}

function post(path: string, body: unknown, cookie?: string): Request {
  return new Request(`${BASE}/api/auth${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function cookieFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
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

async function createAdmin(auth: ReturnType<typeof setup>["auth"], email = ADMIN_EMAIL) {
  return auth.api.createUser({ body: { email, password: PASSWORD, name: "Owner", role: "admin" } });
}

describe("Better Auth configuration", () => {
  it("disables public sign-up", async () => {
    const { auth, db } = setup();
    const response = await auth.handler(
      post("/sign-up/email", { email: "someone@example.com", password: PASSWORD, name: "X" }),
    );
    expect(response.ok).toBe(false);
    expect(db.user).toHaveLength(0);
  });

  it("creates an allowlisted admin from server code", async () => {
    const { auth, db } = setup();
    const { user } = await createAdmin(auth);
    expect(user.role).toBe("admin");
    expect(db.user).toHaveLength(1);
    // The password is stored only as a hash on the credential account.
    const account = db.account!.find((row) => row.providerId === "credential");
    expect(account?.password).toBeTypeOf("string");
    expect(account?.password).not.toBe(PASSWORD);
  });

  it("refuses to create an admin whose email is not allowlisted", async () => {
    const { auth, db } = setup();
    await expect(createAdmin(auth, "intruder@example.com")).rejects.toBeTruthy();
    expect(db.user).toHaveLength(0);
  });

  it("signs in an allowlisted admin, and refuses once removed from the allowlist", async () => {
    const { auth } = setup();
    await createAdmin(auth);

    const ok = await auth.handler(
      post("/sign-in/email", { email: ADMIN_EMAIL, password: PASSWORD }),
    );
    expect(ok.status).toBe(200);
    expect(cookieFrom(ok)).toContain("haulix.session_token=");

    vi.stubEnv("ADMIN_EMAILS", "someone-else@haulix.test");
    const blocked = await auth.handler(
      post("/sign-in/email", { email: ADMIN_EMAIL, password: PASSWORD }),
    );
    expect(blocked.ok).toBe(false);
  });

  it("rejects a wrong password", async () => {
    const { auth } = setup();
    await createAdmin(auth);
    const response = await auth.handler(
      post("/sign-in/email", { email: ADMIN_EMAIL, password: "Wrong-Password-1!" }),
    );
    expect(response.ok).toBe(false);
  });

  it("does not let a signed-in admin create users or change roles over HTTP", async () => {
    const { auth, db } = setup();
    await createAdmin(auth);
    const signIn = await auth.handler(
      post("/sign-in/email", { email: ADMIN_EMAIL, password: PASSWORD }),
    );
    const cookie = cookieFrom(signIn);

    const create = await auth.handler(
      post(
        "/admin/create-user",
        { email: "new-admin@haulix.test", password: PASSWORD, name: "New", role: "admin" },
        cookie,
      ),
    );
    expect(create.status).toBe(403);

    const setRole = await auth.handler(
      post("/admin/set-role", { userId: db.user![0]!.id, role: "admin" }, cookie),
    );
    expect(setRole.status).toBe(403);
    expect(db.user).toHaveLength(1);
  });

  it("grants lead permissions to admins only, and nothing to carriers", async () => {
    const { auth } = setup();
    const check = (role: "admin" | "carrier", permissions: Record<string, string[]>) =>
      auth.api.userHasPermission({ body: { role, permissions } });

    expect((await check("admin", { lead: ["list", "read", "update-status"] })).success).toBe(true);
    expect((await check("admin", { leadNote: ["create", "update", "delete"] })).success).toBe(true);
    expect((await check("admin", { user: ["create"] })).success).toBe(false);
    expect((await check("admin", { user: ["set-role"] })).success).toBe(false);
    expect((await check("admin", { user: ["impersonate"] })).success).toBe(false);
    expect((await check("carrier", { lead: ["read"] })).success).toBe(false);
  });

  it("keeps two-factor dormant: no TOTP endpoints while it is postponed", () => {
    const { auth } = setup();
    expect("enableTwoFactor" in auth.api).toBe(false);
    expect("verifyTOTP" in auth.api).toBe(false);
  });
});
