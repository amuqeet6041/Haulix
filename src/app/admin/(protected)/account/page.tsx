import type { Metadata } from "next";

import { requireAdminPage } from "@/lib/admin-page";

export const metadata: Metadata = { title: "Account" };

/** /admin/account. Shows who is signed in. Never shows ids, sessions or tokens. */
export default async function AdminAccountPage() {
  const admin = await requireAdminPage();

  return (
    <section aria-labelledby="account-title">
      <p className="label-caps text-orange">Account</p>
      <h1 id="account-title" className="mt-2 text-3xl font-semibold tracking-tight">
        Your account
      </h1>
      <dl className="mt-8 grid gap-4 rounded-panel card-surface p-7 sm:grid-cols-2">
        <div>
          <dt className="label-caps text-gray">Name</dt>
          <dd className="mt-1 text-foreground">{admin.name}</dd>
        </div>
        <div>
          <dt className="label-caps text-gray">Email</dt>
          <dd className="mt-1 break-all text-foreground">{admin.email}</dd>
        </div>
        <div>
          <dt className="label-caps text-gray">Role</dt>
          <dd className="mt-1 text-foreground">Administrator</dd>
        </div>
      </dl>
    </section>
  );
}
