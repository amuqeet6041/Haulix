import { Inbox, LayoutDashboard, UserRound, type LucideIcon } from "lucide-react";

/**
 * Admin sidebar links and the helpers that decide which one is current and
 * what the header breadcrumb shows. Pure data and functions, so they are easy
 * to test. Every href lives under /admin, which proxy.ts and the admin guard
 * protect.
 */

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_ROOT = "/admin";

export const adminNav: readonly AdminNavItem[] = [
  { href: ADMIN_ROOT, label: "Dashboard", icon: LayoutDashboard },
  { href: `${ADMIN_ROOT}/leads`, label: "Leads", icon: Inbox },
  { href: `${ADMIN_ROOT}/account`, label: "Account", icon: UserRound },
];

/** Strips a trailing slash so "/admin/" and "/admin" compare equal. */
function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/**
 * Whether `href` is the current section. The dashboard matches only /admin
 * itself; other items also match their sub-pages (/admin/leads/abc keeps
 * "Leads" active) but never a different path that merely starts with the same
 * letters (/admin/leadership).
 */
export function isAdminNavCurrent(href: string, pathname: string): boolean {
  const path = normalize(pathname);
  if (href === ADMIN_ROOT) return path === ADMIN_ROOT;
  return path === href || path.startsWith(`${href}/`);
}

export interface Breadcrumb {
  label: string;
  /** Present on every crumb except the last, which is the current page. */
  href?: string;
}

/** Breadcrumb trail for the header: "Admin / Leads / Details". */
export function adminBreadcrumbs(pathname: string): Breadcrumb[] {
  const path = normalize(pathname);
  const section = adminNav.find(
    (item) => item.href !== ADMIN_ROOT && isAdminNavCurrent(item.href, path),
  );

  if (path === ADMIN_ROOT) return [{ label: "Admin", href: ADMIN_ROOT }, { label: "Dashboard" }];
  if (!section) return [{ label: "Admin", href: ADMIN_ROOT }, { label: "Page" }];
  if (path === section.href)
    return [{ label: "Admin", href: ADMIN_ROOT }, { label: section.label }];
  return [
    { label: "Admin", href: ADMIN_ROOT },
    { label: section.label, href: section.href },
    { label: "Details" },
  ];
}
