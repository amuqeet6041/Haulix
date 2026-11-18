// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/admin/me/route";

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  getAuth: () => ({ api: { getSession: mocks.getSession } }),
  isAuthConfigured: () => true,
}));

const session = {
  session: {
    id: "sess_1",
    userId: "user_1",
    expiresAt: new Date(Date.now() + 60_000),
    token: "secret-token",
  },
  user: { id: "user_1", email: "admin@haulix.test", name: "Admin", role: "admin" },
};

function get() {
  return new Request("http://localhost:3000/api/admin/me", { headers: { cookie: "x=y" } });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  mocks.getSession.mockReset();
});

describe("GET /api/admin/me", () => {
  it("returns only the name and email of an authorized admin, uncached", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@haulix.test");
    mocks.getSession.mockResolvedValue(session);

    const response = await GET(get(), {});
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true, admin: { name: "Admin", email: "admin@haulix.test" } });
    expect(JSON.stringify(body)).not.toMatch(/secret-token|sess_1|user_1/);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("returns 401 without a session and 403 for a non-admin", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("ADMIN_EMAILS", "admin@haulix.test");
    mocks.getSession.mockResolvedValueOnce(null);
    expect((await GET(get(), {})).status).toBe(401);

    mocks.getSession.mockResolvedValueOnce({
      ...session,
      user: { ...session.user, role: "carrier" },
    });
    expect((await GET(get(), {})).status).toBe(403);
  });
});
