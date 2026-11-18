import type { ReactNode } from "react";

import { SignOutButton } from "@/components/admin/sign-out-button";
import { requireAdminPage } from "@/lib/admin-page";

/**
 * Protected admin pages. Checks admin access on the server for every request
 * (session, role, ADMIN_EMAILS, ban) and redirects to /admin/login otherwise.
 * Each page also calls requireAdminPage() itself, so a page never depends on
 * its layout for authorization.
 */
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminPage();

  return (
    <>
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <p className="font-display text-lg font-bold tracking-wide">
            HAULIX <span className="text-orange">Admin</span>
          </p>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-gray sm:inline">{admin.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        {children}
      </main>
    </>
  );
}
