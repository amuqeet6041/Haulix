import { SearchX } from "lucide-react";
import Link from "next/link";

import { ErrorNotice } from "@/components/admin/error-notice";
import { LeadsFilters } from "@/components/admin/leads-filters";
import { LeadsTable } from "@/components/admin/leads-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonVariants } from "@/components/ui/button";
import {
  buildLeadsHref,
  clearFiltersHref,
  hasActiveFilters,
  type LeadListState,
} from "@/lib/admin-lead-url";
import type { AdminServiceResult, LeadListResult } from "@/types/admin";

const SORT_LABELS: Record<LeadListState["sort"], string> = {
  createdAt: "submission date",
  fullName: "name",
  status: "status",
  type: "type",
};

const ERROR_TEXT = {
  not_configured: "The lead database is not connected, so there is nothing to show yet.",
  not_found: "We could not load the leads. Please refresh the page to try again.",
  failed: "We could not load the leads. Please refresh the page to try again.",
} as const;

function tableCaption(state: LeadListState, data: LeadListResult): string {
  const direction =
    state.sort === "createdAt"
      ? state.dir === "desc"
        ? "newest first"
        : "oldest first"
      : state.dir === "asc"
        ? "ascending"
        : "descending";
  return `Leads, page ${data.page} of ${data.totalPages}, ${data.pageSize} per page, sorted by ${SORT_LABELS[state.sort]}, ${direction}.`;
}

/**
 * Body of /admin/leads: the filter form plus whichever of the four states
 * applies (error, nothing yet, nothing matching, results). Server component;
 * it only renders what the page already loaded.
 */
export function LeadsListView({
  state,
  result,
}: {
  state: LeadListState;
  result: AdminServiceResult<LeadListResult>;
}) {
  if (!result.ok) {
    return (
      <>
        <LeadsFilters state={state} />
        <ErrorNotice title="Leads unavailable" className="mt-6">
          {ERROR_TEXT[result.reason]}
        </ErrorNotice>
      </>
    );
  }

  const { data } = result;
  const filtered = hasActiveFilters(state);

  return (
    <>
      <LeadsFilters state={state} />

      <div className="mt-6">
        {data.total === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchX}
              title="No leads match your filters"
              description="Try a different search, or clear the filters to see every lead."
              action={
                <Link
                  href={clearFiltersHref(state)}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Clear filters
                </Link>
              }
            />
          ) : (
            <EmptyState
              title="No leads yet"
              description="New carrier inquiries and contact messages will appear here as soon as they are submitted."
            />
          )
        ) : (
          <div className="space-y-4">
            <LeadsTable leads={data.leads} state={state} caption={tableCaption(state, data)} />
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              hrefFor={(page) => buildLeadsHref({ ...state, page })}
            />
          </div>
        )}
      </div>
    </>
  );
}
