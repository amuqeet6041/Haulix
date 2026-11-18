// @vitest-environment node
import { describe, expect, it } from "vitest";

import { adminBreadcrumbs, adminNav, isAdminNavCurrent } from "@/config/admin-navigation";
import { pageWindow } from "@/components/ui/pagination";

describe("adminNav", () => {
  it("lists Dashboard, Leads and Account, all under /admin", () => {
    expect(adminNav.map((item) => [item.label, item.href])).toEqual([
      ["Dashboard", "/admin"],
      ["Leads", "/admin/leads"],
      ["Account", "/admin/account"],
    ]);
  });
});

describe("isAdminNavCurrent", () => {
  it("marks the dashboard current only on /admin itself", () => {
    expect(isAdminNavCurrent("/admin", "/admin")).toBe(true);
    expect(isAdminNavCurrent("/admin", "/admin/")).toBe(true);
    expect(isAdminNavCurrent("/admin", "/admin/leads")).toBe(false);
    expect(isAdminNavCurrent("/admin", "/admin/account")).toBe(false);
  });

  it("keeps a section current on its sub-pages", () => {
    expect(isAdminNavCurrent("/admin/leads", "/admin/leads")).toBe(true);
    expect(isAdminNavCurrent("/admin/leads", "/admin/leads/")).toBe(true);
    expect(isAdminNavCurrent("/admin/leads", "/admin/leads/cmi4x2k7p")).toBe(true);
    expect(isAdminNavCurrent("/admin/leads", "/admin")).toBe(false);
    expect(isAdminNavCurrent("/admin/leads", "/admin/account")).toBe(false);
  });

  it("does not match a different path that only starts with the same letters", () => {
    expect(isAdminNavCurrent("/admin/leads", "/admin/leadership")).toBe(false);
    expect(isAdminNavCurrent("/admin/account", "/admin/accounting")).toBe(false);
  });

  it("marks exactly one item current for every admin page", () => {
    for (const path of ["/admin", "/admin/leads", "/admin/leads/abc", "/admin/account"]) {
      expect(adminNav.filter((item) => isAdminNavCurrent(item.href, path))).toHaveLength(1);
    }
  });
});

describe("adminBreadcrumbs", () => {
  it("builds the trail for each page", () => {
    expect(adminBreadcrumbs("/admin")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Dashboard" },
    ]);
    expect(adminBreadcrumbs("/admin/leads")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Leads" },
    ]);
    expect(adminBreadcrumbs("/admin/leads/abc123")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Leads", href: "/admin/leads" },
      { label: "Details" },
    ]);
  });

  it("falls back to a generic page label for unknown admin paths", () => {
    expect(adminBreadcrumbs("/admin/unknown")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Page" },
    ]);
  });

  it("never links the last crumb", () => {
    for (const path of ["/admin", "/admin/leads", "/admin/leads/x", "/admin/account"]) {
      const crumbs = adminBreadcrumbs(path);
      expect(crumbs[crumbs.length - 1]!.href).toBeUndefined();
    }
  });
});

describe("pageWindow", () => {
  it("shows every page when there are few", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("collapses skipped pages into gaps, keeping first, last and neighbours", () => {
    expect(pageWindow(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
    expect(pageWindow(1, 20)).toEqual([1, 2, "gap", 20]);
    expect(pageWindow(20, 20)).toEqual([1, "gap", 19, 20]);
  });

  it("does not hide a single skipped page behind a gap", () => {
    expect(pageWindow(4, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
  });

  it("clamps out-of-range and fractional input", () => {
    expect(pageWindow(99, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(-5, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(1, 0)).toEqual([1]);
  });
});
