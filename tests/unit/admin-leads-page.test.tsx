import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LeadsListView } from "@/components/admin/leads-list-view";

const mocks = vi.hoisted(() => ({
  requireAdminPage: vi.fn(),
  listLeads: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/admin-page", () => ({ requireAdminPage: mocks.requireAdminPage }));
vi.mock("@/services/admin-lead.service", () => ({ listLeads: mocks.listLeads }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
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

const { default: AdminLeadsPage } = await import("@/app/admin/(protected)/leads/page");
const { default: LeadsLoading } = await import("@/app/admin/(protected)/leads/loading");
const { default: LeadsError } = await import("@/app/admin/(protected)/leads/error");

const admin = { userId: "u", sessionId: "s", email: "admin@haulix.test", name: "Admin" };

const list = (page: number, totalPages: number, total: number, pageSize = 25) => ({
  ok: true,
  data: { leads: [], page, pageSize, total, totalPages },
});

const render_ = async (params: Record<string, string | string[] | undefined> = {}) =>
  AdminLeadsPage({ searchParams: Promise.resolve(params) });

afterEach(() => {
  cleanup();
  mocks.requireAdminPage.mockReset();
  mocks.listLeads.mockReset();
  mocks.redirect.mockClear();
});

describe("/admin/leads page: access", () => {
  it("checks access before reading the query or the database", async () => {
    mocks.requireAdminPage.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(render_({ status: "SPAM" })).rejects.toThrow("REDIRECT:/admin/login");
    expect(mocks.listLeads).not.toHaveBeenCalled();
  });

  it("passes the authorized admin's context to the service", async () => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    mocks.listLeads.mockResolvedValue(list(1, 1, 0));
    await render_();
    expect(mocks.listLeads).toHaveBeenCalledWith(admin, expect.any(Object));
  });
});

describe("/admin/leads page: reading the URL", () => {
  async function queryFor(params: Record<string, string | string[] | undefined>) {
    mocks.requireAdminPage.mockResolvedValue(admin);
    // Plenty of pages, so a page number from the URL is never "past the end".
    mocks.listLeads.mockResolvedValue(list(1, 100_000, 0));
    await render_(params);
    return mocks.listLeads.mock.calls.at(-1)![1];
  }

  it("uses defaults for an empty URL", async () => {
    expect(await queryFor({})).toEqual({ page: 1, pageSize: 25, sort: "createdAt", dir: "desc" });
  });

  it("applies search, type, status, sort, page size and page from the URL", async () => {
    expect(
      await queryFor({
        q: "  alvarez ",
        type: "CONTACT",
        status: "REJECTED",
        sort: "fullName",
        dir: "asc",
        pageSize: "50",
        page: "2",
      }),
    ).toEqual({
      q: "alvarez",
      type: "CONTACT",
      status: "REJECTED",
      sort: "fullName",
      dir: "asc",
      pageSize: 50,
      page: 2,
    });
  });

  it.each(["NEW", "CONTACTED", "QUALIFIED", "ONBOARDED", "REJECTED", "SPAM"])(
    "filters by the %s status",
    async (status) => {
      expect(await queryFor({ status })).toMatchObject({ status });
    },
  );

  it.each([10, 25, 50])("accepts a page size of %i", async (pageSize) => {
    expect(await queryFor({ pageSize: String(pageSize) })).toMatchObject({ pageSize });
  });

  it("falls back to defaults for bad values instead of failing", async () => {
    expect(
      await queryFor({
        page: "-3",
        pageSize: "7",
        type: "NEWSLETTER",
        status: "ARCHIVED",
        sort: "ipHash",
        dir: "up",
      }),
    ).toEqual({ page: 1, pageSize: 25, sort: "createdAt", dir: "desc" });
  });

  it("falls back for a non-numeric or huge page number", async () => {
    expect(await queryFor({ page: "abc" })).toMatchObject({ page: 1 });
    expect(await queryFor({ page: "999999999" })).toMatchObject({ page: 1 });
  });

  it("uses the first value of a repeated parameter and cuts an over-long search", async () => {
    expect(await queryFor({ status: ["SPAM", "NEW"] })).toMatchObject({ status: "SPAM" });
    const q = (await queryFor({ q: "x".repeat(300) })).q as string;
    expect(q).toHaveLength(100);
  });

  it("never lets URL parameters reach the service beyond the whitelisted query fields", async () => {
    const query = await queryFor({ ipHash: "x", where: "{}", take: "100000", skip: "5" });
    expect(Object.keys(query).sort()).toEqual(["dir", "page", "pageSize", "sort"]);
  });
});

describe("/admin/leads page: out-of-range pages", () => {
  const allParams = {
    q: "alvarez",
    type: "CARRIER_INQUIRY",
    status: "SPAM",
    sort: "fullName",
    dir: "asc",
    pageSize: "10",
  };

  function redirectTarget() {
    const target = new URL(mocks.redirect.mock.calls[0]![0], "http://x");
    return { path: target.pathname, params: Object.fromEntries(target.searchParams) };
  }

  it("redirects to page 1, keeping search, type, status, sort and page size", async () => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    mocks.listLeads.mockResolvedValue(list(9, 4, 40, 10));
    await expect(render_({ ...allParams, page: "9" })).rejects.toThrow(/^REDIRECT:/);

    const { path, params } = redirectTarget();
    expect(path).toBe("/admin/leads");
    // Page 1 is the default, so it is simply left out of the URL.
    expect(params).toEqual({
      q: "alvarez",
      type: "CARRIER_INQUIRY",
      status: "SPAM",
      sort: "fullName",
      dir: "asc",
      pageSize: "10",
    });
    expect(params).not.toHaveProperty("page");
  });

  it("goes to page 1, not the last page, even when several pages exist", async () => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    mocks.listLeads.mockResolvedValue(list(50, 4, 90, 25));
    await expect(render_({ page: "50" })).rejects.toThrow("REDIRECT:/admin/leads");
  });

  it("keeps the filters when a filtered search has no results and a later page was requested", async () => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    mocks.listLeads.mockResolvedValue(list(5, 1, 0, 10));
    await expect(render_({ ...allParams, page: "5" })).rejects.toThrow(/^REDIRECT:/);

    const { path, params } = redirectTarget();
    // Not the unfiltered list: the person keeps their search and sees "No leads match".
    expect(path).toBe("/admin/leads");
    expect(params).toMatchObject({ q: "alvarez", type: "CARRIER_INQUIRY", status: "SPAM" });
    expect(params).toMatchObject({ sort: "fullName", dir: "asc", pageSize: "10" });
    expect(params).not.toHaveProperty("page");
  });

  it("goes to the plain list only when there were no filters to keep", async () => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    mocks.listLeads.mockResolvedValue(list(5, 1, 0));
    await expect(render_({ page: "5" })).rejects.toThrow("REDIRECT:/admin/leads");
    expect(mocks.redirect.mock.calls[0]![0]).toBe("/admin/leads");
  });

  it("drops invalid parameters but keeps the valid ones when redirecting", async () => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    mocks.listLeads.mockResolvedValue(list(7, 1, 0, 25));
    await expect(
      render_({ page: "7", status: "SPAM", type: "NEWSLETTER", sort: "ipHash", pageSize: "7" }),
    ).rejects.toThrow(/^REDIRECT:/);
    expect(redirectTarget().params).toEqual({ status: "SPAM" });
  });

  it("ends up on a page that does not redirect again (no loop)", async () => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    mocks.listLeads.mockResolvedValue(list(9, 1, 0, 10));
    await expect(render_({ ...allParams, page: "9" })).rejects.toThrow(/^REDIRECT:/);
    const target = new URL(mocks.redirect.mock.calls[0]![0], "http://x");

    // Follow the redirect: the landing request is page 1 of an empty filtered result.
    mocks.redirect.mockClear();
    mocks.listLeads.mockResolvedValue(list(1, 1, 0, 10));
    await expect(render_(Object.fromEntries(target.searchParams))).resolves.toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("does not redirect a valid page, the last page, or the first page of an empty list", async () => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    for (const [page, totalPages, total] of [
      [2, 4, 90],
      [4, 4, 90],
      [1, 1, 0],
    ] as const) {
      mocks.listLeads.mockResolvedValue(list(page, totalPages, total));
      await expect(render_({ page: String(page) })).resolves.toBeTruthy();
    }
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("does not redirect when the service failed (it shows the error state instead)", async () => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    mocks.listLeads.mockResolvedValue({ ok: false, reason: "failed" });
    await expect(render_({ page: "9" })).resolves.toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("/admin/leads page: rendering", () => {
  it("renders the heading, description and the list view with the parsed state and result", async () => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    const result = list(1, 1, 0);
    mocks.listLeads.mockResolvedValue(result);
    const page = (await render_({ status: "SPAM" })) as ReactElement;

    render(page);
    expect(screen.getByRole("heading", { level: 1, name: "Leads" })).toBeInTheDocument();
    expect(screen.getByText(/Search, filter and open any lead/)).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("SPAM");
    expect(
      screen.getByRole("heading", { name: "No leads match your filters" }),
    ).toBeInTheDocument();
  });

  it("passes the service result to the list view", async () => {
    mocks.requireAdminPage.mockResolvedValue(admin);
    const result = { ok: false, reason: "not_configured" };
    mocks.listLeads.mockResolvedValue(result);
    const page = (await render_()) as ReactElement<{ children: ReactElement[] }>;
    const section = page.props.children as unknown as ReactElement[];
    const view = (section[section.length - 1] as ReactElement<{ children: ReactElement }>).props
      .children;
    expect(view.type).toBe(LeadsListView);
    expect((view.props as { result: unknown }).result).toBe(result);
  });
});

describe("/admin/leads loading and error pages", () => {
  it("shows a loading skeleton announced once, under the page heading", () => {
    render(<LeadsLoading />);
    expect(screen.getByRole("heading", { level: 1, name: "Leads" })).toBeInTheDocument();
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading leads");
  });

  it("shows a generic alert with a working retry, never the error's details", () => {
    const retry = vi.fn();
    const error = Object.assign(new Error("connection refused: postgres://secret"), {
      digest: "abc123",
    });
    render(<LeadsError error={error} retry={retry} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(document.body).not.toHaveTextContent(/postgres|secret|abc123/);
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("falls back to reset() when retry is not provided", () => {
    const reset = vi.fn();
    render(<LeadsError error={new Error("x")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("shows no button when neither recovery function exists", () => {
    render(<LeadsError error={new Error("x")} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
