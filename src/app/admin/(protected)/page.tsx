import type { Metadata } from "next";

import { requireAdminPage } from "@/lib/admin-page";

export const metadata: Metadata = { title: "Dashboard" };

/** /admin. Dashboard placeholder; the lead overview arrives in a later step. */
export default async function AdminDashboardPage() {
  const admin = await requireAdminPage();

  return (
    <section aria-labelledby="dashboard-title">
      <p className="label-caps text-orange">Dashboard</p>
      <h1 id="dashboard-title" className="mt-2 text-3xl font-semibold tracking-tight">
        Welcome, {admin.name}
      </h1>
      <div className="mt-8 rounded-panel card-surface p-7">
        <h2 className="text-lg font-semibold">Lead management</h2>
        <p className="mt-2 text-sm text-gray">
          Viewing and updating carrier inquiries and contact messages will be available here in the
          next step.
        </p>
      </div>
    </section>
  );
}
