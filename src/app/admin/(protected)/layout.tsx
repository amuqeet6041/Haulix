import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-page";

/**
 * Protected admin pages. Checks admin access on the server for every request
 * (session, role, ADMIN_EMAILS, ban) and redirects to /admin/login otherwise.
 * Each page also calls requireAdminPage() itself, so a page never depends on
 * its layout for authorization. /admin/login sits outside this group, so it
 * never gets the dashboard shell.
 *
 * Only the name and email reach the client shell, never the full admin
 * context (user id, session id).
 */
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminPage();

  return <AdminShell user={{ name: admin.name, email: admin.email }}>{children}</AdminShell>;
}
