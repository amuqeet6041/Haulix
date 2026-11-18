import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { checkAdmin, type AdminCheck, type AdminContext } from "@/lib/admin-guard";

/**
 * Server-rendered admin pages. Server only.
 *
 * Same checks as the admin API (`checkAdmin` in lib/admin-guard.ts), run on
 * the server for every request. Cached per request so a layout and its page
 * share one session lookup.
 */

export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_HOME_PATH = "/admin";

export const getAdminForRequest = cache(async (): Promise<AdminCheck> =>
  checkAdmin(await headers()),
);

/** Where the login page sends people who are not (or no longer) allowed in. */
export function loginRedirectFor(denial: Exclude<AdminCheck, { ok: true }>["denial"]): string {
  if (denial === "forbidden") return `${ADMIN_LOGIN_PATH}?reason=denied`;
  if (denial === "unavailable") return `${ADMIN_LOGIN_PATH}?reason=unavailable`;
  return ADMIN_LOGIN_PATH;
}

/** Use at the top of every protected admin page or layout. Redirects unless allowed. */
export async function requireAdminPage(): Promise<AdminContext> {
  const result = await getAdminForRequest();
  if (!result.ok) redirect(loginRedirectFor(result.denial));
  return result.admin;
}
