import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminShell } from "@/components/admin/admin-shell";

const nav = vi.hoisted(() => ({
  pathname: "/admin",
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace, refresh: nav.refresh }),
}));

// A plain anchor: no router context needed, and no real navigation in jsdom.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      {...props}
      // Like next/link: run the caller's handler first, then take over navigation.
      onClick={(event) => {
        props.onClick?.(event);
        event.preventDefault();
      }}
    >
      {children}
    </a>
  ),
}));

const user = { name: "Abdul Muqeet", email: "admin@haulix.test" };

function renderShell(pathname = "/admin") {
  nav.pathname = pathname;
  return render(
    <AdminShell user={user}>
      <h1>Page content</h1>
    </AdminShell>,
  );
}

const sidebar = () => screen.getByRole("complementary", { name: "Admin sidebar" });

beforeEach(() => {
  nav.replace.mockReset();
  nav.refresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AdminShell: structure", () => {
  it("renders the sidebar, header and main landmarks around the page", () => {
    renderShell();
    expect(sidebar()).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(within(main).getByRole("heading", { name: "Page content" })).toBeInTheDocument();
  });

  it("shows HAULIX branding that links to the admin dashboard, not the public site", () => {
    renderShell();
    const brand = within(sidebar()).getByRole("link", {
      name: /HAULIX Logistics admin dashboard/i,
    });
    expect(brand).toHaveAttribute("href", "/admin");
  });

  it("shows the signed-in admin's name and email in the header and sidebar", () => {
    renderShell();
    expect(within(screen.getByRole("banner")).getByText("Abdul Muqeet")).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).getByText("admin@haulix.test")).toBeInTheDocument();
    expect(within(sidebar()).getByText("admin@haulix.test")).toBeInTheDocument();
  });

  it("offers a sign-out action in the sidebar", () => {
    renderShell();
    expect(within(sidebar()).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});

describe("AdminShell: active navigation", () => {
  const links = () => within(screen.getByRole("navigation", { name: "Admin" }));

  it("lists Dashboard, Leads and Account with working hrefs", () => {
    renderShell();
    expect(links().getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/admin");
    expect(links().getByRole("link", { name: "Leads" })).toHaveAttribute("href", "/admin/leads");
    expect(links().getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/admin/account",
    );
  });

  it.each([
    ["/admin", "Dashboard"],
    ["/admin/leads", "Leads"],
    ["/admin/leads/cmi4x2k7p0000abcd1234efgh", "Leads"],
    ["/admin/account", "Account"],
  ])("marks only the right link current on %s", (path, expected) => {
    renderShell(path);
    const current = links()
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(expected);
  });

  it("shows a breadcrumb that ends on the current page", () => {
    renderShell("/admin/leads");
    const crumbs = within(screen.getByRole("navigation", { name: "Breadcrumb" }));
    expect(crumbs.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(crumbs.getByText("Leads")).toHaveAttribute("aria-current", "page");
  });

  it("links back to the section from a detail page", () => {
    renderShell("/admin/leads/abc");
    const crumbs = within(screen.getByRole("navigation", { name: "Breadcrumb" }));
    expect(crumbs.getByRole("link", { name: "Leads" })).toHaveAttribute("href", "/admin/leads");
    expect(crumbs.getByText("Details")).toHaveAttribute("aria-current", "page");
  });
});

describe("AdminShell: mobile menu", () => {
  const openButton = () => screen.getByRole("button", { name: "Open admin menu" });

  it("has a labelled menu button and no open drawer at first", () => {
    renderShell();
    expect(openButton()).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a drawer with the same links and the account block", async () => {
    const u = userEvent.setup();
    renderShell("/admin/leads");
    await u.click(openButton());

    const drawer = await screen.findByRole("dialog", { name: "HAULIX Admin" });
    const nav = within(within(drawer).getByRole("navigation", { name: "Admin mobile" }));
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Dashboard",
      "Leads",
      "Account",
    ]);
    expect(nav.getByRole("link", { name: "Leads" })).toHaveAttribute("aria-current", "page");
    expect(within(drawer).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(within(drawer).getByText("admin@haulix.test")).toBeInTheDocument();
  });

  it("moves focus into the drawer and closes it on Escape, returning focus to the button", async () => {
    const u = userEvent.setup();
    renderShell();
    await u.click(openButton());
    const drawer = await screen.findByRole("dialog");
    expect(drawer).toContainElement(document.activeElement as HTMLElement);

    await u.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(openButton()).toHaveFocus();
  });

  it("closes after choosing a page", async () => {
    const u = userEvent.setup();
    renderShell();
    await u.click(openButton());
    const drawer = await screen.findByRole("dialog");
    await u.click(within(drawer).getByRole("link", { name: "Account" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes with its close button", async () => {
    const u = userEvent.setup();
    renderShell();
    await u.click(openButton());
    await u.click(await screen.findByRole("button", { name: "Close menu" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("AdminShell: sign out", () => {
  it("ends the session and returns to the sign-in page", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const u = userEvent.setup();
    renderShell();

    await u.click(within(sidebar()).getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/admin/login"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/sign-out",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("AdminShell: toasts", () => {
  it("provides the toast live regions to every admin page", () => {
    renderShell();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
