import type { Metadata } from "next";

import { requireAdminPage } from "@/lib/admin-page";

export const metadata: Metadata = { title: "Leads" };

/** /admin/leads. Placeholder until the leads table is built in the next step. */
export default async function AdminLeadsPage() {
  await requireAdminPage();

  return (
    <section aria-labelledby="leads-title">
      <p className="label-caps text-orange">Leads</p>
      <h1 id="leads-title" className="mt-2 text-3xl font-semibold tracking-tight">
        Leads
      </h1>
      <div className="mt-8 rounded-panel card-surface p-7">
        <h2 className="text-lg font-semibold">Coming next</h2>
        <p className="mt-2 text-sm text-gray">
          The searchable table of carrier inquiries and contact messages will appear here.
        </p>
      </div>
    </section>
  );
}
