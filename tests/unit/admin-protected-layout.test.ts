// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";

import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminShell } from "@/components/admin/admin-shell";

const mocks = vi.hoisted(() => ({ requireAdminPage: vi.fn() }));

vi.mock("@/lib/admin-page", () => ({
  requireAdminPage: mocks.requireAdminPage,
  ADMIN_HOME_PATH: "/admin",
}));

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

const root = path.resolve(__dirname, "../../src/app/admin");
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

afterEach(() => mocks.requireAdminPage.mockReset());

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
  it.each([
    ["dashboard", AdminDashboardPage],
    ["leads", AdminLeadsPage],
    ["account", AdminAccountPage],
  ])("%s redirects instead of rendering when access is refused", async (_name, Page) => {
    mocks.requireAdminPage.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(Page()).rejects.toThrow("REDIRECT:/admin/login");
    expect(mocks.requireAdminPage).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["dashboard", AdminDashboardPage],
    ["leads", AdminLeadsPage],
    ["account", AdminAccountPage],
  ])("%s renders for an authorized admin", async (_name, Page) => {
    mocks.requireAdminPage.mockResolvedValue(context);
    await expect(Page()).resolves.toBeTruthy();
  });

  it("the account page shows the name and email but never ids", async () => {
    mocks.requireAdminPage.mockResolvedValue(context);
    const text = JSON.stringify(await AdminAccountPage());
    expect(text).toContain("admin@haulix.test");
    expect(text).not.toMatch(/user_secret_id|session_secret_id/);
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
