import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { equipmentLabel } from "@/components/admin/leads-table";
import { LeadsListView } from "@/components/admin/leads-list-view";
import { leadStatuses } from "@/content/lead-status";
import { getEquipmentService } from "@/content/services";
import type { LeadListState } from "@/lib/admin-lead-url";
import type { AdminLeadSummary, AdminServiceResult, LeadListResult } from "@/types/admin";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const base: LeadListState = {
  page: 1,
  pageSize: 25,
  sort: "createdAt",
  dir: "desc",
  type: undefined,
  status: undefined,
  q: undefined,
};

function lead(id: string, overrides: Partial<AdminLeadSummary> = {}): AdminLeadSummary {
  return {
    id,
    type: "CARRIER_INQUIRY",
    status: "NEW",
    fullName: `Driver ${id}`,
    email: `${id}@example.com`,
    phone: "(555) 010-0001",
    companyName: `${id} Freight LLC`,
    equipment: "dry-van",
    fleetSize: 3,
    inquiryType: null,
    createdAt: "2026-11-18T10:00:00.000Z",
    updatedAt: "2026-11-18T10:00:00.000Z",
    ...overrides,
  };
}

function ok(
  leads: AdminLeadSummary[],
  extra: Partial<LeadListResult> = {},
): AdminServiceResult<LeadListResult> {
  return {
    ok: true,
    data: {
      leads,
      page: 1,
      pageSize: 25,
      total: leads.length,
      totalPages: 1,
      ...extra,
    },
  };
}

const rows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);

describe("LeadsListView: table", () => {
  it("renders a captioned, semantic table with column headers and a row header per lead", () => {
    render(<LeadsListView state={base} result={ok([lead("a"), lead("b")])} />);
    const table = screen.getByRole("table", {
      name: /Leads, page 1 of 1, 25 per page, sorted by submission date, newest first/,
    });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/\s+/g, " ").trim());
    expect(headers[0]).toMatch(/^Lead/);
    expect(headers).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Company/),
        expect.stringMatching(/^Equipment/),
      ]),
    );
    expect(
      within(table)
        .getAllByRole("rowheader")
        .map((cell) => cell.textContent),
    ).toEqual([expect.stringContaining("Driver a"), expect.stringContaining("Driver b")]);
  });

  it("shows name, contact details, type, company, equipment, status and date", () => {
    render(<LeadsListView state={base} result={ok([lead("a")])} />);
    const [row] = rows();
    expect(row).toHaveTextContent("Driver a");
    expect(row).toHaveTextContent("a@example.com");
    expect(row).toHaveTextContent("(555) 010-0001");
    expect(row).toHaveTextContent("Carrier inquiry");
    expect(row).toHaveTextContent("a Freight LLC");
    expect(row).toHaveTextContent("Dry Van");
    expect(within(row!).getByText("New")).toBeInTheDocument();
    expect(row!.querySelector("time")).toHaveAttribute("datetime", "2026-11-18T10:00:00.000Z");
  });

  it("handles contact messages and missing company, equipment and phone", () => {
    render(
      <LeadsListView
        state={base}
        result={ok([
          lead("c", {
            type: "CONTACT",
            companyName: null,
            equipment: null,
            phone: null,
            inquiryType: "PRICING",
          }),
        ])}
      />,
    );
    const [row] = rows();
    expect(row).toHaveTextContent("Contact message");
    expect(within(row!).getAllByLabelText("Not provided")).toHaveLength(2);
    expect(row).not.toHaveTextContent("(555)");
  });

  it("shows every status with its label, including Rejected and Spam", () => {
    const leads = leadStatuses.map((status) => lead(status.value, { status: status.value }));
    render(<LeadsListView state={base} result={ok(leads)} />);
    for (const status of leadStatuses) {
      const row = rows().find((r) => r.textContent?.includes(`Driver ${status.value}`))!;
      expect(within(row).getByText(status.label)).toBeInTheDocument();
    }
    expect(within(screen.getByRole("table")).getByText("Rejected")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Spam")).toBeInTheDocument();
  });

  it("gives each lead one clearly named link to its detail page", () => {
    render(<LeadsListView state={base} result={ok([lead("abc")])} />);
    const link = screen.getByRole("link", { name: "View details for Driver abc" });
    expect(link).toHaveAttribute("href", "/admin/leads/abc");
  });

  it("keeps the table in a horizontally scrolling frame and folds columns on small screens", () => {
    render(<LeadsListView state={base} result={ok([lead("a")])} />);
    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto");
    const company = screen.getByRole("columnheader", { name: "Company" });
    expect(company).toHaveClass("hidden", "lg:table-cell");
  });

  it("maps equipment slugs to readable names", () => {
    expect(equipmentLabel("reefer")).toBe(getEquipmentService("reefer")!.name);
    expect(equipmentLabel("mystery")).toBe("mystery");
    expect(equipmentLabel(null)).toBeNull();
  });
});

describe("LeadsListView: private data", () => {
  it("renders only the summary fields even if a lead object carried private ones", () => {
    const leaky = {
      ...lead("a"),
      ipHash: "leaked-ip-hash",
      userAgent: "leaked-agent",
      submissionId: "leaked-submission",
      notes: "leaked legacy note",
      message: "leaked message body",
    } as AdminLeadSummary;
    const { container } = render(<LeadsListView state={base} result={ok([leaky])} />);
    expect(container.innerHTML).not.toMatch(/leaked/);
  });
});

describe("LeadsListView: sorting headers", () => {
  it("marks the sorted column with aria-sort and offers a link to reverse it", () => {
    render(<LeadsListView state={base} result={ok([lead("a")])} />);
    const submitted = screen.getByRole("columnheader", { name: /Submitted/ });
    expect(submitted).toHaveAttribute("aria-sort", "descending");
    expect(within(submitted).getByRole("link")).toHaveAttribute("href", "/admin/leads?dir=asc");
    expect(screen.getByRole("columnheader", { name: /^Lead/ })).toHaveAttribute(
      "aria-sort",
      "none",
    );
  });

  it("keeps filters in sort links and returns to page 1", () => {
    render(
      <LeadsListView
        state={{ ...base, q: "alvarez", status: "SPAM", page: 3 }}
        result={ok([lead("a")], { page: 3, totalPages: 5, total: 120 })}
      />,
    );
    const href = within(screen.getByRole("columnheader", { name: /^Status/ }))
      .getByRole("link")
      .getAttribute("href")!;
    const params = new URL(href, "http://x").searchParams;
    expect(params.get("q")).toBe("alvarez");
    expect(params.get("status")).toBe("SPAM");
    expect(params.get("sort")).toBe("status");
    expect(params.get("page")).toBeNull();
  });
});

describe("LeadsListView: filters form", () => {
  it("has labelled search and filter fields in a search landmark", () => {
    render(<LeadsListView state={base} result={ok([lead("a")])} />);
    const form = screen.getByRole("search", { name: "Search and filter leads" });
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/leads");
    expect(within(form).getByLabelText("Search")).toHaveAttribute("name", "q");
    expect(within(form).getByLabelText("Type")).toHaveAttribute("name", "type");
    expect(within(form).getByLabelText("Status")).toHaveAttribute("name", "status");
    expect(within(form).getByLabelText("Rows per page")).toHaveAttribute("name", "pageSize");
    expect(within(form).getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });

  it("offers every status including Rejected and Spam, and both lead types", () => {
    render(<LeadsListView state={base} result={ok([lead("a")])} />);
    const status = screen.getByLabelText("Status");
    expect(
      within(status)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["All statuses", "New", "Contacted", "Qualified", "Onboarded", "Rejected", "Spam"]);
    expect(
      within(screen.getByLabelText("Type"))
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["All types", "Carrier inquiry", "Contact message"]);
  });

  it("offers the page sizes 10, 25 and 50", () => {
    render(<LeadsListView state={{ ...base, pageSize: 50 }} result={ok([lead("a")])} />);
    const size = screen.getByLabelText("Rows per page") as HTMLSelectElement;
    expect([...size.options].map((o) => o.value)).toEqual(["10", "25", "50"]);
    expect(size.value).toBe("50");
  });

  it("shows the current search, type and status back in the controls", () => {
    render(
      <LeadsListView
        state={{ ...base, q: "alvarez", type: "CONTACT", status: "REJECTED" }}
        result={ok([lead("a")])}
      />,
    );
    expect(screen.getByLabelText("Search")).toHaveValue("alvarez");
    expect(screen.getByLabelText("Type")).toHaveValue("CONTACT");
    expect(screen.getByLabelText("Status")).toHaveValue("REJECTED");
  });

  it("caps the search box at 100 characters", () => {
    render(<LeadsListView state={base} result={ok([lead("a")])} />);
    expect(screen.getByLabelText("Search")).toHaveAttribute("maxlength", "100");
  });

  it("keeps a non-default sort when a new search is submitted, and drops the page", () => {
    const { container } = render(
      <LeadsListView
        state={{ ...base, sort: "fullName", dir: "asc", page: 4 }}
        result={ok([lead("a")], { page: 4, totalPages: 5, total: 120 })}
      />,
    );
    const form = container.querySelector("form")!;
    expect(form.querySelector("input[name=sort]")).toHaveValue("fullName");
    expect(form.querySelector("input[name=dir]")).toHaveValue("asc");
    expect(form.querySelector("[name=page]")).toBeNull();
  });

  it("shows 'Clear filters' only when filters are active, keeping sort and size", () => {
    const { rerender } = render(<LeadsListView state={base} result={ok([lead("a")])} />);
    expect(screen.queryByRole("link", { name: "Clear filters" })).not.toBeInTheDocument();

    rerender(
      <LeadsListView
        state={{ ...base, q: "x", status: "SPAM", pageSize: 50, page: 2 }}
        result={ok([lead("a")])}
      />,
    );
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/admin/leads?pageSize=50",
    );
  });
});

describe("LeadsListView: pagination", () => {
  const manyPages = (page: number, state: Partial<LeadListState> = {}) =>
    render(
      <LeadsListView
        state={{ ...base, page, ...state }}
        result={ok([lead("a")], { page, totalPages: 12, total: 300 })}
      />,
    );

  it("shows the range and total", () => {
    manyPages(3);
    expect(screen.getByText("Showing 51 to 75 of 300")).toBeInTheDocument();
  });

  it("links to neighbouring pages", () => {
    manyPages(3);
    const nav = within(screen.getByRole("navigation", { name: "Pagination" }));
    expect(nav.getByRole("link", { name: "Previous page" })).toHaveAttribute(
      "href",
      "/admin/leads?page=2",
    );
    expect(nav.getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/admin/leads?page=4",
    );
    expect(nav.getByRole("link", { name: "Page 12" })).toHaveAttribute(
      "href",
      "/admin/leads?page=12",
    );
    // Page 1 is the plain list URL.
    expect(nav.getByRole("link", { name: "Page 1" })).toHaveAttribute("href", "/admin/leads");
  });

  it("keeps search, type, status, sort and page size in every pagination link", () => {
    manyPages(2, {
      q: "alvarez",
      type: "CARRIER_INQUIRY",
      status: "REJECTED",
      sort: "fullName",
      dir: "asc",
      pageSize: 10,
    });
    const links = within(screen.getByRole("navigation", { name: "Pagination" })).getAllByRole(
      "link",
    );
    expect(links.length).toBeGreaterThan(3);
    for (const link of links) {
      const params = new URL(link.getAttribute("href")!, "http://x").searchParams;
      expect(Object.fromEntries(params)).toMatchObject({
        q: "alvarez",
        type: "CARRIER_INQUIRY",
        status: "REJECTED",
        sort: "fullName",
        dir: "asc",
        pageSize: "10",
      });
    }
  });

  it("has no previous link on the first page and no pagination for a single page", () => {
    manyPages(1);
    expect(screen.getByLabelText("Previous page")).toHaveAttribute("aria-disabled", "true");
    cleanup();
    render(<LeadsListView state={base} result={ok([lead("a")])} />);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 to 1 of 1")).toBeInTheDocument();
  });
});

describe("LeadsListView: empty and error states", () => {
  it("shows 'No leads yet' when there are no leads and no filters", () => {
    render(<LeadsListView state={base} result={ok([])} />);
    expect(screen.getByRole("heading", { name: "No leads yet" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("shows 'No leads match your filters' with a way back when filters find nothing", () => {
    render(<LeadsListView state={{ ...base, q: "zzz", status: "SPAM" }} result={ok([])} />);
    expect(
      screen.getByRole("heading", { name: "No leads match your filters" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No leads yet" })).not.toBeInTheDocument();
    // One in the form, one in the empty state.
    const links = screen.getAllByRole("link", { name: "Clear filters" });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/admin/leads");
    expect(screen.getByLabelText("Search")).toHaveValue("zzz");
  });

  it("keeps the filter form usable above an error", () => {
    render(<LeadsListView state={base} result={{ ok: false, reason: "failed" }} />);
    expect(screen.getByRole("search")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Leads unavailable");
    expect(alert).toHaveTextContent(/refresh the page/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("explains a missing database connection", () => {
    render(<LeadsListView state={base} result={{ ok: false, reason: "not_configured" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/not connected/i);
  });
});
