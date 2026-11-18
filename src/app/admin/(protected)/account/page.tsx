import type { Metadata } from "next";
import { headers } from "next/headers";

import { AccountView } from "@/components/admin/account-view";
import { requireAdminPage } from "@/lib/admin-page";
import { getAccountProfile, listAccountSessions } from "@/services/admin-account.service";

export const metadata: Metadata = { title: "Account" };

/**
 * /admin/account. Manage your own profile name, password and sessions. Access
 * is checked first, and everything shown belongs to the signed-in admin: the
 * services take the user from the verified session, never from the URL. The
 * page never receives password data or session tokens.
 */
export default async function AdminAccountPage() {
  const admin = await requireAdminPage();
  const [profile, sessions] = await Promise.all([
    getAccountProfile(admin),
    listAccountSessions(admin, await headers()),
  ]);

  return (
    <section aria-labelledby="account-title">
      <p className="label-caps text-orange">Account</p>
      <h1 id="account-title" className="mt-2 text-3xl font-semibold tracking-tight">
        Your account
      </h1>
      <p className="mt-2 text-sm text-gray">
        Manage your profile, password and the devices signed in to your account.
      </p>
      <div className="mt-8">
        <AccountView profile={profile} sessions={sessions} />
      </div>
    </section>
  );
}
