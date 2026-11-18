"use client";

import { ChevronRight, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ToastProvider } from "@/components/ui/toast";
import { adminBreadcrumbs, ADMIN_ROOT } from "@/config/admin-navigation";
import { siteConfig } from "@/config/site";

export interface AdminShellUser {
  name: string;
  email: string;
}

/** Brand block: the HAULIX mark linking to the dashboard (not the public site). */
function AdminBrand() {
  return (
    <Link
      href={ADMIN_ROOT}
      aria-label={`${siteConfig.name} Logistics admin dashboard`}
      className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <Image
        src="/logos/haulix-logo.png"
        alt=""
        width={960}
        height={349}
        sizes="120px"
        className="h-9 w-auto"
      />
      <span className="rounded-md bg-orange/15 px-2 py-1 label-caps text-orange">Admin</span>
    </Link>
  );
}

function AccountSummary({ user }: { user: AdminShellUser }) {
  return (
    <div className="flex items-center gap-3 text-left">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange/15 font-display text-sm font-bold text-orange"
      >
        {user.name.trim().charAt(0).toUpperCase() || "A"}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{user.name}</span>
        <span className="block truncate text-xs text-gray">{user.email}</span>
      </span>
    </div>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const crumbs = adminBreadcrumbs(pathname);
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight className="size-3.5 shrink-0 text-gray/60" aria-hidden="true" />
              ) : null}
              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className="rounded text-gray transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={last ? "truncate font-semibold text-foreground" : "text-gray"}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The protected admin frame: sidebar (desktop), slide-in menu (tablet and
 * mobile), header and the toast area. Authorization happens on the server in
 * the layout and pages that render this; the shell only draws the chrome.
 */
export function AdminShell({
  user,
  children,
}: {
  user: AdminShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <ToastProvider>
      <aside
        aria-label="Admin sidebar"
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-ink-warm lg:flex"
      >
        <div className="flex h-16 items-center border-b border-border px-5">
          <AdminBrand />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <AdminSidebarNav label="Admin" />
        </div>
        <div className="space-y-3 border-t border-border p-4">
          <AccountSummary user={user} />
          <SignOutButton className="w-full" />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-ink/90 px-4 backdrop-blur sm:px-8">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="size-10 lg:hidden"
                aria-label="Open admin menu"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-ink-warm">
              <SheetTitle className="font-display text-lg font-bold text-white">
                {siteConfig.name} Admin
              </SheetTitle>
              <SheetDescription className="sr-only">Admin navigation</SheetDescription>
              <div className="mt-2">
                <AdminSidebarNav
                  label="Admin mobile"
                  wrapLink={(link, key) => (
                    <SheetClose asChild key={key}>
                      {link}
                    </SheetClose>
                  )}
                />
              </div>
              <div className="mt-auto space-y-3 border-t border-border pt-4">
                <AccountSummary user={user} />
                <SignOutButton className="w-full" />
              </div>
            </SheetContent>
          </Sheet>

          <Breadcrumbs pathname={pathname} />

          <div className="ml-auto hidden sm:block">
            <AccountSummary user={user} />
          </div>
        </header>

        <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
