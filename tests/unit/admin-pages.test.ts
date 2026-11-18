// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { evaluateAdminSession, type AdminCheck } from "@/lib/admin-guard";
import { loginRedirectFor, requireAdminPage } from "@/lib/admin-page";

const mocks = vi.hoisted(() => ({
  check: vi.fn<() => Promise<AdminCheck>>(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/admin-guard", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  checkAdmin: mocks.check,
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("loginRedirectFor", () => {
  it("sends each denial to the login page with the right notice", () => {
    expect(loginRedirectFor("unauthenticated")).toBe("/admin/login");
    expect(loginRedirectFor("forbidden")).toBe("/admin/login?reason=denied");
    expect(loginRedirectFor("unavailable")).toBe("/admin/login?reason=unavailable");
  });
});

describe("requireAdminPage", () => {
  it.each([
    ["unauthenticated", "/admin/login"],
    ["forbidden", "/admin/login?reason=denied"],
    ["unavailable", "/admin/login?reason=unavailable"],
  ] as const)("redirects a %s visitor to %s", async (denial, target) => {
    mocks.check.mockResolvedValue({ ok: false, denial });
    await expect(requireAdminPage()).rejects.toThrow(`REDIRECT:${target}`);
  });

  it("returns the admin context for an authorized admin", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@haulix.test");
    const evaluation = evaluateAdminSession({
      session: { id: "s", userId: "u", expiresAt: new Date(Date.now() + 60_000) },
      user: { id: "u", email: "admin@haulix.test", name: "Admin", role: "admin" },
    });
    if (!evaluation.ok) throw new Error("setup failed");
    mocks.check.mockResolvedValue({ ok: true, admin: evaluation.admin });

    await expect(requireAdminPage()).resolves.toMatchObject({ email: "admin@haulix.test" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
