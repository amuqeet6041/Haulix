import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LeadsListView } from "@/components/admin/leads-list-view";
import { buildLeadsHref } from "@/lib/admin-lead-url";
import { requireAdminPage } from "@/lib/admin-page";
import { listLeads } from "@/services/admin-lead.service";
import { leadListPageQuerySchema, searchParamsToRecord } from "@/validations/admin-leads";

export const metadata: Metadata = { title: "Leads" };

interface AdminLeadsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * /admin/leads. The URL is the source of truth: search, type, status, sort,
 * page size and page all live in the query string. Bad values fall back to
 * their defaults (leadListPageQuerySchema), so a mangled bookmark still loads.
 * A page past the end (or any page > 1 of an empty result) redirects to page 1
 * of the SAME search, filters, sort and page size, instead of showing an empty
 * table and without dropping the filters. The service is the same one behind GET /api/admin/leads, so the
 * `lead:list` permission and the safe field list apply here too.
 */
export default async function AdminLeadsPage({ searchParams }: AdminLeadsPageProps) {
  const admin = await requireAdminPage();
  const query = leadListPageQuerySchema.parse(searchParamsToRecord(await searchParams));

  const result = await listLeads(admin, query);
  if (result.ok && query.page > result.data.totalPages) {
    redirect(buildLeadsHref({ ...query, page: 1 }));
  }

  return (
    <section aria-labelledby="leads-title">
      <p className="label-caps text-orange">Leads</p>
      <h1 id="leads-title" className="mt-2 text-3xl font-semibold tracking-tight">
        Leads
      </h1>
      <p className="mt-2 text-sm text-gray">
        Carrier inquiries and contact messages from the website. Search, filter and open any lead.
      </p>
      <div className="mt-8">
        <LeadsListView state={query} result={result} />
      </div>
    </section>
  );
}
