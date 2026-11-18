import { LeadsTableSkeleton } from "@/components/admin/leads-table";

/** Shown while /admin/leads loads, including when filters or pages change. */
export default function LeadsLoading() {
  return (
    <section aria-labelledby="leads-title">
      <p className="label-caps text-orange">Leads</p>
      <h1 id="leads-title" className="mt-2 text-3xl font-semibold tracking-tight">
        Leads
      </h1>
      <div className="mt-8">
        <LeadsTableSkeleton />
      </div>
    </section>
  );
}
