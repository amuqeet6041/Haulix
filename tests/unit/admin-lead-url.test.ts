// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  buildLeadsHref,
  clearFiltersHref,
  hasActiveFilters,
  leadDetailHref,
  LEADS_PATH,
  sortedState,
  type LeadListState,
} from "@/lib/admin-lead-url";
import { leadListPageQuerySchema, searchParamsToRecord } from "@/validations/admin-leads";

const base: LeadListState = {
  page: 1,
  pageSize: 25,
  sort: "createdAt",
  dir: "desc",
  type: undefined,
  status: undefined,
  q: undefined,
};

const parse = (url: string) =>
  leadListPageQuerySchema.parse(searchParamsToRecord(new URL(url, "http://x").searchParams));

describe("buildLeadsHref", () => {
  it("is just the path for the default list", () => {
    expect(buildLeadsHref(base)).toBe(LEADS_PATH);
  });

  it("leaves defaults and blank filters out of the URL", () => {
    expect(buildLeadsHref({ ...base, q: "", page: 1, pageSize: 25 })).toBe(LEADS_PATH);
  });

  it("puts every non-default value in the URL", () => {
    const href = buildLeadsHref({
      page: 3,
      pageSize: 50,
      type: "CONTACT",
      status: "SPAM",
      q: "jane & co",
      sort: "fullName",
      dir: "asc",
    });
    const params = new URL(href, "http://x").searchParams;
    expect(Object.fromEntries(params)).toEqual({
      q: "jane & co",
      type: "CONTACT",
      status: "SPAM",
      pageSize: "50",
      sort: "fullName",
      dir: "asc",
      page: "3",
    });
  });

  it("encodes search text so it cannot add parameters", () => {
    const href = buildLeadsHref({ ...base, q: "a&status=SPAM#x" });
    const params = new URL(href, "http://x").searchParams;
    expect(params.get("q")).toBe("a&status=SPAM#x");
    expect(params.get("status")).toBeNull();
  });

  it.each([
    { ...base, q: "alvarez", type: "CARRIER_INQUIRY" as const, status: "REJECTED" as const },
    { ...base, page: 4, pageSize: 10 as const, sort: "status" as const, dir: "asc" as const },
    { ...base, status: "SPAM" as const, page: 2 },
    { ...base, q: '%_\\ and "quotes" é' },
  ])("round-trips through the page's own query parser: %j", (state) => {
    expect(parse(buildLeadsHref(state))).toEqual({
      ...state,
      // The parser leaves absent filters undefined, which toEqual treats as equal.
    });
  });
});

describe("filters", () => {
  it("detects active filters", () => {
    expect(hasActiveFilters(base)).toBe(false);
    expect(hasActiveFilters({ ...base, q: "x" })).toBe(true);
    expect(hasActiveFilters({ ...base, type: "CONTACT" })).toBe(true);
    expect(hasActiveFilters({ ...base, status: "SPAM" })).toBe(true);
    // Sorting and page size are not filters.
    expect(hasActiveFilters({ ...base, ...{ sort: "status", pageSize: 50 } })).toBe(false);
  });

  it("clearing keeps sort and page size but drops filters and the page", () => {
    const href = clearFiltersHref({
      ...base,
      q: "x",
      type: "CONTACT",
      status: "SPAM",
      page: 4,
      pageSize: 50,
      sort: "fullName",
      dir: "asc",
    });
    expect(Object.fromEntries(new URL(href, "http://x").searchParams)).toEqual({
      pageSize: "50",
      sort: "fullName",
      dir: "asc",
    });
  });
});

describe("sortedState", () => {
  it("starts a new column newest-first for dates and A-Z for the rest, on page 1", () => {
    expect(sortedState({ ...base, page: 5 }, "fullName")).toMatchObject({
      sort: "fullName",
      dir: "asc",
      page: 1,
    });
    expect(sortedState({ ...base, sort: "fullName", dir: "asc" }, "createdAt")).toMatchObject({
      sort: "createdAt",
      dir: "desc",
    });
  });

  it("reverses the direction when the same column is clicked again", () => {
    expect(sortedState({ ...base, sort: "status", dir: "asc" }, "status").dir).toBe("desc");
    expect(sortedState({ ...base, sort: "status", dir: "desc" }, "status").dir).toBe("asc");
    expect(sortedState(base, "createdAt").dir).toBe("asc");
  });

  it("keeps the filters", () => {
    const next = sortedState({ ...base, q: "x", status: "NEW" }, "type");
    expect(next).toMatchObject({ q: "x", status: "NEW", sort: "type" });
  });
});

describe("leadDetailHref", () => {
  it("points at the Step 6 detail route and encodes the id", () => {
    expect(leadDetailHref("cmi4x2k7p0000abcd1234efgh")).toBe(
      "/admin/leads/cmi4x2k7p0000abcd1234efgh",
    );
    expect(leadDetailHref("a b/c?d")).toBe("/admin/leads/a%20b%2Fc%3Fd");
  });
});
