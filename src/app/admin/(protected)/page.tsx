import type { Metadata } from "next";
import { Suspense } from "react";

import {
  DashboardError,
  DashboardSkeleton,
  DashboardStatsView,
} from "@/components/admin/dashboard-view";
import type { AdminContext } from "@/lib/admin-guard";
import { requireAdminPage } from "@/lib/admin-page";
import { getDashboardStats } from "@/services/admin-lead.service";

export const metadata: Metadata = { title: "Dashboard" };

/** Loads the stats on the server and renders them, or an error state. */
async function DashboardContent({ admin }: { admin: AdminContext }) {
  const result = await getDashboardStats(admin);
  if (!result.ok) {
    return (
      <DashboardError reason={result.reason === "not_configured" ? "not_configured" : "failed"} />
    );
  }
  return <DashboardStatsView stats={result.data} />;
}

/**
 * /admin. Lead totals and the newest leads. The heading renders at once and
 * the numbers stream in behind a skeleton. Data is read on the server for each
 * request: this page reads the session, so it is never statically cached.
 */
export default async function AdminDashboardPage() {
  const admin = await requireAdminPage();

  return (
    <section aria-labelledby="dashboard-title">
      <p className="label-caps text-orange">Dashboard</p>
      <h1 id="dashboard-title" className="mt-2 text-3xl font-semibold tracking-tight">
        Welcome, {admin.name}
      </h1>
      <p className="mt-2 text-sm text-gray">A snapshot of every lead the website has received.</p>
      <div className="mt-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent admin={admin} />
        </Suspense>
      </div>
    </section>
  );
}
