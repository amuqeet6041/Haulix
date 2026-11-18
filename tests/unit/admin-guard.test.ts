// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AdminAccessError,
  adminHasPermission,
  assertAdmin,
  evaluateAdminSession,
  requireAdmin,
  withAdmin,
  type AdminPermissions,
  type SessionLike,
} from "@/lib/admin-guard";

const ADMIN_EMAIL = "admin@haulix.test";
const future = new Date(Date.now() + 60 * 60_000);

function session(
  overrides: {
    user?: Partial<SessionLike["user"]>;
    session?: Partial<SessionLike["session"]>;
  } = {},
): SessionLike {
  return {
    session: { id: "sess_1", userId: "user_1", expiresAt: future, ...overrides.session },
    user: {
      id: "user_1",
      email: ADMIN_EMAIL,
      name: "Admin",
      role: "admin",
      banned: false,
      ...overrides.user,
    },
  };
}

const configured = () => true;

/** Permissions outside the declared statements (the type system rejects them; runtime must too). */
function unknownPermission(permissions: Record<string, string[]>): AdminPermissions {
  return permissions as AdminPermissions;
}

function get(headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/admin/probe", { headers });
}

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", ADMIN_EMAIL);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("evaluateAdminSession", () => {
  it("allows an allowlisted admin with a valid session (password only)", () => {
    const result = evaluateAdminSession(session());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.admin).toMatchObject({
        userId: "user_1",
        email: ADMIN_EMAIL,
        sessionId: "sess_1",
      });
      expect(Object.isFrozen(result.admin)).toBe(true);
      expect(JSON.stringify(result.admin)).not.toMatch(/token/i);
    }
  });

  it.each([
    ["no session", null, "unauthenticated", "no_session"],
    [
      "an expired session",
      session({ session: { expiresAt: new Date(Date.now() - 1000) } }),
      "unauthenticated",
      "expired_session",
    ],
    ["a carrier", session({ user: { role: "carrier" } }), "forbidden", "not_admin"],
    ["a user without a role", session({ user: { role: null } }), "forbidden", "not_admin"],
    [
      "an admin missing from ADMIN_EMAILS",
      session({ user: { email: "other@haulix.test" } }),
      "forbidden",
      "not_allowlisted",
    ],
    ["a banned admin", session({ user: { banned: true } }), "forbidden", "banned"],
    [
      "an impersonation session",
      session({ session: { impersonatedBy: "user_2" } }),
      "forbidden",
      "impersonated",
    ],
  ] as const)("denies %s", (_, input, denial, reason) => {
    expect(evaluateAdminSession(input)).toEqual({ ok: false, denial, reason });
  });

  it("treats an expired ban as lifted", () => {
    const result = evaluateAdminSession(
      session({ user: { banned: true, banExpires: new Date(Date.now() - 1000) } }),
    );
    expect(result.ok).toBe(true);
  });

  it("does not require two-factor while TOTP is postponed", () => {
    expect(evaluateAdminSession(session()).ok).toBe(true);
  });

  it("matches the allowlist case-insensitively", () => {
    expect(evaluateAdminSession(session({ user: { email: "ADMIN@Haulix.test" } })).ok).toBe(true);
  });
});

describe("requireAdmin", () => {
  it("returns 401 with no-cache headers when there is no session", async () => {
    const result = await requireAdmin(get(), {
      getSession: async () => null,
      isConfigured: configured,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      expect(result.response.headers.get("Cache-Control")).toContain("no-store");
      expect(result.response.headers.get("X-Robots-Tag")).toContain("noindex");
      expect(result.response.headers.get("WWW-Authenticate")).toBeTruthy();
      await expect(result.response.json()).resolves.toEqual({
        ok: false,
        code: "unauthenticated",
        message: "Please sign in to continue.",
      });
    }
  });

  it("returns the same generic 403 for every 'forbidden' reason", async () => {
    const bodies = [];
    for (const input of [
      session({ user: { role: "carrier" } }),
      session({ user: { email: "other@haulix.test" } }),
      session({ user: { banned: true } }),
    ]) {
      const result = await requireAdmin(get(), {
        getSession: async () => input,
        isConfigured: configured,
      });
      if (result.ok) throw new Error("expected a denial");
      expect(result.response.status).toBe(403);
      bodies.push(await result.response.json());
    }
    expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
  });

  it("passes the request headers to Better Auth's session lookup", async () => {
    const getSession = vi.fn(async () => session());
    const request = get({ cookie: "haulix.session_token=abc" });
    const result = await requireAdmin(request, { getSession, isConfigured: configured });
    expect(result.ok).toBe(true);
    expect(getSession).toHaveBeenCalledWith(request.headers);
  });

  it("answers 503, never 200, when auth is not configured or the lookup fails", async () => {
    const notConfigured = await requireAdmin(get(), { isConfigured: () => false });
    expect(notConfigured.ok).toBe(false);
    if (!notConfigured.ok) expect(notConfigured.response.status).toBe(503);

    const failing = await requireAdmin(get(), {
      getSession: async () => {
        throw new Error("db down for admin@haulix.test");
      },
      isConfigured: configured,
    });
    if (failing.ok) throw new Error("expected a denial");
    expect(failing.response.status).toBe(503);
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).not.toContain("admin@haulix.test");
  });

  it("enforces the requested permission", async () => {
    const allowed = await requireAdmin(get(), {
      getSession: async () => session(),
      isConfigured: configured,
      permissions: { lead: ["list"] },
    });
    expect(allowed.ok).toBe(true);

    const denied = await requireAdmin(get(), {
      getSession: async () => session(),
      isConfigured: configured,
      permissions: unknownPermission({ user: ["create"] }),
    });
    if (denied.ok) throw new Error("expected a denial");
    expect(denied.response.status).toBe(403);
  });

  it("logs the user id and reason but never the email", async () => {
    await requireAdmin(get(), {
      getSession: async () => session({ user: { email: "other@haulix.test" } }),
      isConfigured: configured,
    });
    const logged = vi.mocked(console.warn).mock.calls.flat().join(" ");
    expect(logged).toContain("user_1");
    expect(logged).toContain("not_allowlisted");
    expect(logged).not.toContain("other@haulix.test");
  });
});

describe("assertAdmin (service layer)", () => {
  function issued() {
    const result = evaluateAdminSession(session());
    if (!result.ok) throw new Error("setup failed");
    return result.admin;
  }

  it("accepts a context issued by the guard", () => {
    expect(() => assertAdmin(issued(), { lead: ["read"] })).not.toThrow();
  });

  it("rejects a forged or copied context", () => {
    const forged = { userId: "user_1", email: ADMIN_EMAIL, name: "Admin", sessionId: "sess_1" };
    expect(() => assertAdmin(forged)).toThrow(AdminAccessError);
    expect(() => assertAdmin({ ...issued() })).toThrow(AdminAccessError);
    expect(() => assertAdmin(undefined)).toThrow(AdminAccessError);
  });

  it("rejects once the admin is removed from ADMIN_EMAILS", () => {
    const admin = issued();
    vi.stubEnv("ADMIN_EMAILS", "someone-else@haulix.test");
    expect(() => assertAdmin(admin)).toThrow(AdminAccessError);
  });

  it("rejects a permission the admin role does not have", () => {
    expect(() => assertAdmin(issued(), unknownPermission({ user: ["set-role"] }))).toThrow(
      AdminAccessError,
    );
    expect(adminHasPermission({ leadNote: ["create"] })).toBe(true);
    expect(adminHasPermission(unknownPermission({ user: ["impersonate"] }))).toBe(false);
  });
});

describe("withAdmin (route wrapper)", () => {
  const options = { getSession: async () => session(), isConfigured: configured };

  it("runs the handler for an authorized admin and adds no-cache headers", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const route = withAdmin({ lead: ["list"] }, handler, options);
    const response = await route(get(), {});
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("never runs the handler when the guard denies", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const route = withAdmin({ lead: ["list"] }, handler, {
      ...options,
      getSession: async () => null,
    });
    expect((await route(get(), {})).status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("rejects a state-changing request from another origin before checking the session", async () => {
    const getSession = vi.fn(async () => session());
    const route = withAdmin({ lead: ["update-status"] }, async () => Response.json({ ok: true }), {
      ...options,
      getSession,
    });
    const response = await route(
      new Request("http://localhost:3000/api/admin/probe", {
        method: "PATCH",
        headers: { Origin: "https://evil.test" },
      }),
      {},
    );
    expect(response.status).toBe(403);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("turns a service-level AdminAccessError into the matching response", async () => {
    const route = withAdmin(
      { lead: ["read"] },
      async () => {
        throw new AdminAccessError("forbidden");
      },
      options,
    );
    expect((await route(get(), {})).status).toBe(403);
  });

  it("hides unexpected errors behind a generic 500", async () => {
    const route = withAdmin(
      { lead: ["read"] },
      async () => {
        throw new Error("secret detail");
      },
      options,
    );
    const response = await route(get(), {});
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret detail");
  });
});
