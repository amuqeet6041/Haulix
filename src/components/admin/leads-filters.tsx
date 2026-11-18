import { Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { leadStatuses, leadTypeOptions } from "@/content/lead-status";
import {
  clearFiltersHref,
  hasActiveFilters,
  LEADS_PATH,
  type LeadListState,
} from "@/lib/admin-lead-url";
import { LEAD_PAGE_SIZES, LEAD_SEARCH_MAX } from "@/validations/admin-leads";

/**
 * Search and filters as a plain GET form. It works without JavaScript, the
 * browser puts the values in the URL (bookmarkable, shareable, back-button
 * friendly), and submitting always lands on page 1 because the page number is
 * not a field. Sorting is carried in hidden fields so a new search keeps it.
 */
export function LeadsFilters({ state }: { state: LeadListState }) {
  const filtered = hasActiveFilters(state);

  return (
    <form
      method="get"
      action={LEADS_PATH}
      role="search"
      aria-label="Search and filter leads"
      className="rounded-2xl card-surface p-4 sm:p-5"
    >
      {state.sort !== "createdAt" ? <input type="hidden" name="sort" value={state.sort} /> : null}
      {state.dir !== "desc" ? <input type="hidden" name="dir" value={state.dir} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <div className="sm:col-span-2 lg:col-span-5">
          <Label htmlFor="leads-q">Search</Label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gray"
              aria-hidden="true"
            />
            <Input
              id="leads-q"
              name="q"
              type="search"
              defaultValue={state.q ?? ""}
              maxLength={LEAD_SEARCH_MAX}
              placeholder="Name, email, company, phone, MC, DOT or subject"
              autoComplete="off"
              className="pl-10"
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="leads-type">Type</Label>
          <Select id="leads-type" name="type" defaultValue={state.type ?? ""} className="mt-1.5">
            <option value="">All types</option>
            {leadTypeOptions.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="leads-status">Status</Label>
          <Select
            id="leads-status"
            name="status"
            defaultValue={state.status ?? ""}
            className="mt-1.5"
          >
            <option value="">All statuses</option>
            {leadStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="leads-page-size">Rows per page</Label>
          <Select
            id="leads-page-size"
            name="pageSize"
            defaultValue={String(state.pageSize)}
            className="mt-1.5"
          >
            {LEAD_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
          <Button type="submit" className="flex-1 lg:flex-none">
            Apply
          </Button>
        </div>
      </div>

      {filtered ? (
        <p className="mt-4 text-sm">
          <Link
            href={clearFiltersHref(state)}
            className="rounded font-semibold text-orange underline-offset-4 hover:underline"
          >
            Clear filters
          </Link>
        </p>
      ) : null}
    </form>
  );
}
