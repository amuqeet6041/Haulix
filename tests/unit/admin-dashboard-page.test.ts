// @vitest-environment node
import { isValidElement, Suspense, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DashboardError,
  DashboardSkeleton,
  DashboardStatsView,
} from "@/components/admin/dashboard-view";

const mocks = vi.hoisted(() => ({ requireAdminPage: vi.fn(), getDashboardStats: vi.fn() }));

vi.mock("@/lib/admin-page", () => ({ requireAdminPage: mocks.requireAdminPage }));
vi.mock("@/services/admin-lead.service", () => ({ getDashboardStats: mocks.getDashboardStats }));

const { default: AdminDashboardPage } = await import("@/app/admin/(protected)/page");

const admin = { userId: "u", sessionId: "s", email: "admin@haulix.test", name: "Admin" };

type AnyElement = ReactElement<{ children?: ReactNode; fallback?: ReactNode; admin?: unknown }>;

/** Depth-first search of a rendered element tree. */
function find(node: ReactNode, match: (el: AnyElement) => boolean): AnyElement | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = find(child, match);
      if (hit) return hit;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  const el = node as AnyElement;
  if (match(el)) return el;
  return find(el.props.children, match);
}

/** Renders the page, then the async content component inside its Suspense boundary. */
async function renderContent() {
  const page = await AdminDashboardPage();
  const boundary = find(page, (el) => el.type === Suspense)!;
  const content = boundary.props.children as AnyElement;
  const render = content.type as (props: unknown) => Promise<AnyElement>;
  return { page, boundary, content, output: await render(content.props) };
}

afterEach(() => {
  mocks.requireAdminPage.mockReset();
  mocks.getDashboardStats.mockReset();
});

describe("/admin dashboard page", () => {
  it("redirects instead of loading any data when access is refused", async () => {
    mocks.requireAdminPage.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(AdminDashboardPage()).rejects.toThrow("REDIRECT:/admin/login");
    expect(mocks.getDashboardStats).not.toHaveBeenCalled();
  });

  it("streams the stats behind a skeleton", async () => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    mocks.getDashboardStats.mockResolvedValue({ ok: true, data: {} });
    const { boundary } = await renderContent();
    expect((boundary.props.fallback as AnyElement).type).toBe(DashboardSkeleton);
  });

  it("loads the stats with the authorized admin's context and shows them", async () => {
    const data = { totalLeads: 0, byStatus: {}, byType: {}, recentLeads: [] };
    mocks.requireAdminPage.mockResolvedValue(admin);
    mocks.getDashboardStats.mockResolvedValue({ ok: true, data });
    const { content, output } = await renderContent();

    expect(content.props.admin).toBe(admin);
    expect(mocks.getDashboardStats).toHaveBeenCalledWith(admin);
    expect(output.type).toBe(DashboardStatsView);
    expect((output.props as { stats: unknown }).stats).toBe(data);
  });

  it.each([
    ["failed", "failed"],
    ["not_configured", "not_configured"],
    ["not_found", "failed"],
  ])("shows the error state when the service reports %s", async (reason, shown) => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    mocks.getDashboardStats.mockResolvedValue({ ok: false, reason });
    const { output } = await renderContent();
    expect(output.type).toBe(DashboardError);
    expect((output.props as { reason: string }).reason).toBe(shown);
  });
});
