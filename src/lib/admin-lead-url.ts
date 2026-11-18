import { DEFAULT_LEAD_PAGE_SIZE, type LeadListQuery } from "@/validations/admin-leads";

/**
 * URLs for the admin leads list and lead detail pages. Pure functions, shared
 * by the pages and the components so filters, sorting and page size always
 * travel together in the address bar (bookmarkable, back-button friendly).
 */

export const LEADS_PATH = "/admin/leads";

/** Detail page for one lead (Step 6). The id is encoded, never trusted. */
export const leadDetailHref = (id: string) => `${LEADS_PATH}/${encodeURIComponent(id)}`;

/** The parts of a list query that go in the URL. */
export type LeadListState = Pick<
  LeadListQuery,
  "page" | "pageSize" | "type" | "status" | "q" | "sort" | "dir"
>;

/**
 * `/admin/leads?...` for a list state. Values equal to their default (page 1,
 * 25 per page, newest first) and empty filters are left out, so the plain
 * list is just `/admin/leads`.
 */
export function buildLeadsHref(state: LeadListState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.type) params.set("type", state.type);
  if (state.status) params.set("status", state.status);
  if (state.pageSize !== DEFAULT_LEAD_PAGE_SIZE) params.set("pageSize", String(state.pageSize));
  if (state.sort !== "createdAt") params.set("sort", state.sort);
  if (state.dir !== "desc") params.set("dir", state.dir);
  if (state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  return query ? `${LEADS_PATH}?${query}` : LEADS_PATH;
}

/** True when a search or a type/status filter narrows the list. */
export function hasActiveFilters(state: Pick<LeadListState, "type" | "status" | "q">): boolean {
  return Boolean(state.q || state.type || state.status);
}

/** The same list with the filters cleared; sort and page size are kept. */
export function clearFiltersHref(state: LeadListState): string {
  return buildLeadsHref({ ...state, q: undefined, type: undefined, status: undefined, page: 1 });
}

/** The state after the person clicks a sortable column header. */
export function sortedState(state: LeadListState, column: LeadListState["sort"]): LeadListState {
  const sameColumn = state.sort === column;
  return {
    ...state,
    sort: column,
    // First click on a new column: newest/A-Z first; clicking again flips it.
    dir: sameColumn
      ? state.dir === "asc"
        ? "desc"
        : "asc"
      : column === "createdAt"
        ? "desc"
        : "asc",
    page: 1,
  };
}
