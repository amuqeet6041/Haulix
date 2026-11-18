// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";

import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminShell } from "@/components/admin/admin-shell";

const mocks = vi.hoisted(() => ({
  requireAdminPage: vi.fn(),
  listLeads: vi.fn(),
  getDashboardStats: vi.fn(),
  getAccountProfile: vi.fn(),
  listAccountSessions: vi.fn(),
}));

vi.mock("@/lib/admin-page", () => ({
  requireAdminPage: mocks.requireAdminPage,
  ADMIN_HOME_PATH: "/admin",
}));

vi.mock("@/services/admin-lead.service", () => ({
  listLeads: mocks.listLeads,
  getDashboardStats: mocks.getDashboardStats,
}));

vi.mock("@/services/admin-account.service", () => ({
  getAccountProfile: mocks.getAccountProfile,
  listAccountSessions: mocks.listAccountSessions,
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { default: ProtectedAdminLayout } = await import("@/app/admin/(protected)/layout");
const { default: AdminDashboardPage } = await import("@/app/admin/(protected)/page");
const { default: AdminLeadsPage } = await import("@/app/admin/(protected)/leads/page");
const { default: AdminAccountPage } = await import("@/app/admin/(protected)/account/page");

const context = {
  userId: "user_secret_id",
  sessionId: "session_secret_id",
  email: "admin@haulix.test",
  name: "Admin",
};

const profile = {
  name: "Admin",
  email: "admin@haulix.test",
  role: "admin",
  memberSince: "2026-11-01T00:00:00.000Z",
};

const root = path.resolve(__dirname, "../../src/app/admin");
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

const emptyList = {
  ok: true,
  data: { leads: [], page: 1, pageSize: 25, total: 0, totalPages: 1 },
};

afterEach(() => {
  mocks.requireAdminPage.mockReset();
  mocks.listLeads.mockReset();
  mocks.getDashboardStats.mockReset();
  mocks.getAccountProfile.mockReset();
  mocks.listAccountSessions.mockReset();
});

/** Each protected page as a zero-argument call, with the props Next would pass. */
const pages = [
  ["dashboard", () => AdminDashboardPage()],
  ["leads", () => AdminLeadsPage({ searchParams: Promise.resolve({}) })],
  ["account", () => AdminAccountPage()],
] as const;

describe("protected admin layout", () => {
  it("refuses to render when the visitor is not an authorized admin", async () => {
    mocks.requireAdminPage.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(ProtectedAdminLayout({ children: "secret page" })).rejects.toThrow(
      "REDIRECT:/admin/login",
    );
  });

  it("wraps authorized pages in the shell and passes only the name and email", async () => {
    mocks.requireAdminPage.mockResolvedValue(context);
    const element = (await ProtectedAdminLayout({ children: "page" })) as ReactElement<{
      user: Record<string, unknown>;
      children: unknown;
    }>;

    expect(element.type).toBe(AdminShell);
    expect(element.props.user).toEqual({ name: "Admin", email: "admin@haulix.test" });
    expect(JSON.stringify(element.props)).not.toMatch(/user_secret_id|session_secret_id/);
    expect(element.props.children).toBe("page");
  });
});

describe("every protected page still checks access itself", () => {
  it.each(pages)(
    "%s redirects instead of rendering when access is refused",
    async (_name, render) => {
      mocks.requireAdminPage.mockRejectedValue(new Error("REDIRECT:/admin/login"));
      await expect(render()).rejects.toThrow("REDIRECT:/admin/login");
      expect(mocks.requireAdminPage).toHaveBeenCalledTimes(1);
      expect(mocks.listLeads).not.toHaveBeenCalled();
    },
  );

  it.each(pages)("%s renders for an authorized admin", async (_name, render) => {
    mocks.requireAdminPage.mockResolvedValue(context);
    mocks.listLeads.mockResolvedValue(emptyList);
    mocks.getAccountProfile.mockResolvedValue({ ok: true, data: profile });
    mocks.listAccountSessions.mockResolvedValue({ ok: true, data: [] });
    await expect(render()).resolves.toBeTruthy();
  });

  it("the account page passes only safe profile and session fields on, never ids or tokens", async () => {
    mocks.requireAdminPage.mockResolvedValue(context);
    mocks.getAccountProfile.mockResolvedValue({ ok: true, data: profile });
    mocks.listAccountSessions.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "sess_opaque",
          current: true,
          device: "Chrome on Windows",
          createdAt: "2026-11-18T10:00:00.000Z",
          lastActiveAt: "2026-11-18T11:00:00.000Z",
          expiresAt: "2026-11-19T10:00:00.000Z",
        },
      ],
    });
    const text = JSON.stringify(await AdminAccountPage());
    expect(text).toContain("admin@haulix.test");
    expect(text).not.toMatch(/user_secret_id|session_secret_id|"token"|passwordHash/i);
    // The services are given the verified admin context for the signed-in user.
    expect(mocks.getAccountProfile).toHaveBeenCalledWith(context);
    expect(mocks.listAccountSessions.mock.calls[0]![0]).toBe(context);
  });
});

describe("login stays outside the dashboard shell", () => {
  it("the login page does not use the shell or the protected layout", () => {
    expect(source("login/page.tsx")).not.toMatch(/AdminShell|admin-shell|\(protected\)/);
  });

  it("the shell is only used by the protected layout", () => {
    expect(source("(protected)/layout.tsx")).toMatch(/AdminShell/);
    expect(source("layout.tsx")).not.toMatch(/AdminShell/);
  });

  it("the admin area is still marked noindex", () => {
    expect(source("layout.tsx")).toMatch(/index: false/);
  });
});
