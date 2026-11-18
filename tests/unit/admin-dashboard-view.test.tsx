import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DashboardError,
  DashboardSkeleton,
  DashboardStatsView,
  leadDetailHref,
} from "@/components/admin/dashboard-view";
import { formatAdminTime, LocalTime } from "@/components/admin/local-time";
import type { AdminLeadSummary, DashboardStats } from "@/types/admin";

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

function summary(id: string, overrides: Partial<AdminLeadSummary> = {}): AdminLeadSummary {
  return {
    id,
    type: "CARRIER_INQUIRY",
    status: "NEW",
    fullName: `Driver ${id}`,
    email: `${id}@example.com`,
    phone: null,
    companyName: null,
    equipment: null,
    fleetSize: null,
    inquiryType: null,
    createdAt: "2026-11-18T10:00:00.000Z",
    updatedAt: "2026-11-18T10:00:00.000Z",
    ...overrides,
  };
}

const stats: DashboardStats = {
  totalLeads: 1234,
  byStatus: { NEW: 300, CONTACTED: 200, QUALIFIED: 150, ONBOARDED: 84, REJECTED: 100, SPAM: 400 },
  byType: { CARRIER_INQUIRY: 900, CONTACT: 334 },
  recentLeads: [
    summary("c3", { fullName: "Maria Alvarez", companyName: "Alvarez Freight LLC" }),
    summary("c2", { fullName: "James Brooks", type: "CONTACT", status: "SPAM" }),
    summary("c1", { fullName: "Luis Chen", status: "REJECTED" }),
  ],
};

const empty: DashboardStats = {
  totalLeads: 0,
  byStatus: { NEW: 0, CONTACTED: 0, QUALIFIED: 0, ONBOARDED: 0, REJECTED: 0, SPAM: 0 },
  byType: { CARRIER_INQUIRY: 0, CONTACT: 0 },
  recentLeads: [],
};

/** Value shown for a stat card, found by its label. */
function statValue(section: HTMLElement, label: string) {
  const term = within(section).getByText(label, { selector: "dt" });
  // The number is the first element in the <dd>; an optional hint follows it.
  return term.nextElementSibling?.firstElementChild?.textContent;
}

describe("DashboardStatsView: statistics", () => {
  it("shows the total and every status, including Rejected and Spam", () => {
    render(<DashboardStatsView stats={stats} />);
    const section = screen.getByRole("region", { name: "Leads by status" });
    expect(statValue(section, "Total leads")).toBe("1,234");
    expect(within(section).getByText("All statuses, including rejected and spam")).toBeVisible();
    expect(statValue(section, "New")).toBe("300");
    expect(statValue(section, "Contacted")).toBe("200");
    expect(statValue(section, "Qualified")).toBe("150");
    expect(statValue(section, "Onboarded")).toBe("84");
    expect(statValue(section, "Rejected")).toBe("100");
    expect(statValue(section, "Spam")).toBe("400");
  });

  it("keeps the explanatory hint inside the total's <dd>, so the <dl> markup stays valid", () => {
    const { container } = render(<DashboardStatsView stats={stats} />);
    const hint = screen.getByText("All statuses, including rejected and spam");
    expect(hint.closest("dd")).not.toBeNull();
    expect(hint.closest("dd")!.previousElementSibling).toHaveTextContent("Total leads");
    // A <dl> may only contain <dt>, <dd> and <div> groups of them: no stray <p>.
    for (const group of container.querySelectorAll("dl > div")) {
      expect([...group.children].map((child) => child.tagName)).toEqual(["DT", "DD"]);
    }
    expect(container.querySelector("dl p")).toBeNull();
  });

  it("shows carrier inquiries and contact messages", () => {
    render(<DashboardStatsView stats={stats} />);
    const section = screen.getByRole("region", { name: "Leads by type" });
    expect(statValue(section, "Carrier inquiries")).toBe("900");
    expect(statValue(section, "Contact messages")).toBe("334");
  });

  it("shows zeros, not blanks, for an empty database", () => {
    render(<DashboardStatsView stats={empty} />);
    const section = screen.getByRole("region", { name: "Leads by status" });
    for (const label of ["Total leads", "New", "Rejected", "Spam"]) {
      expect(statValue(section, label)).toBe("0");
    }
  });
});

describe("DashboardStatsView: recent leads", () => {
  it("lists recent leads in the order given (newest first), each linking to its detail page", () => {
    render(<DashboardStatsView stats={stats} />);
    const section = screen.getByRole("region", { name: "Recent leads" });
    const links = within(within(section).getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin/leads/c3",
      "/admin/leads/c2",
      "/admin/leads/c1",
    ]);
    expect(links[0]).toHaveTextContent("Maria Alvarez");
  });

  it("shows name, company or email, type, status and submission date", () => {
    render(<DashboardStatsView stats={stats} />);
    const [first, second] = within(
      within(screen.getByRole("region", { name: "Recent leads" })).getByRole("list"),
    ).getAllByRole("listitem");

    expect(first).toHaveTextContent("Alvarez Freight LLC");
    expect(first).toHaveTextContent("Carrier");
    expect(within(first!).getByText("New")).toBeInTheDocument();
    expect(first!.querySelector("time")).toHaveAttribute("datetime", "2026-11-18T10:00:00.000Z");

    expect(second).toHaveTextContent("c2@example.com");
    expect(second).toHaveTextContent("Contact");
    expect(within(second!).getByText("Spam")).toBeInTheDocument();
  });

  it("links to the full leads list", () => {
    render(<DashboardStatsView stats={stats} />);
    expect(screen.getByRole("link", { name: "View all leads" })).toHaveAttribute(
      "href",
      "/admin/leads",
    );
  });

  it("shows an empty state, and no list or 'view all' link, when there are no leads", () => {
    render(<DashboardStatsView stats={empty} />);
    const section = screen.getByRole("region", { name: "Recent leads" });
    expect(within(section).getByRole("heading", { name: "No leads yet" })).toBeInTheDocument();
    expect(within(section).queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View all leads" })).not.toBeInTheDocument();
  });

  it("encodes ids in detail links", () => {
    expect(leadDetailHref("a b/c")).toBe("/admin/leads/a%20b%2Fc");
  });
});

describe("loading and error states", () => {
  it("announces the skeleton once as loading", () => {
    render(<DashboardSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading dashboard");
  });

  it("shows an alert when the dashboard fails to load", () => {
    render(<DashboardError reason="failed" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Dashboard unavailable");
    expect(alert).toHaveTextContent(/refresh the page/i);
  });

  it("explains when the database is not connected", () => {
    render(<DashboardError reason="not_configured" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/not connected/i);
  });
});

describe("LocalTime", () => {
  it("formats in a given zone and handles bad input", () => {
    expect(formatAdminTime("2026-11-18T10:05:00.000Z", "UTC")).toBe("Nov 18, 2026, 10:05 AM");
    expect(formatAdminTime("not a date", "UTC")).toBe("Unknown date");
  });

  it("renders a machine-readable time element in the browser's own zone", () => {
    render(<LocalTime iso="2026-11-18T10:05:00.000Z" />);
    const time = screen.getByText(formatAdminTime("2026-11-18T10:05:00.000Z"));
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", "2026-11-18T10:05:00.000Z");
  });
});
