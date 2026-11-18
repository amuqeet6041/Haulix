import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BackToLeads,
  LeadDetailSkeleton,
  LeadDetailView,
} from "@/components/admin/lead-detail-view";
import { leadStatuses } from "@/content/lead-status";
import type { AdminLeadDetail } from "@/types/admin";

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

function carrier(overrides: Partial<AdminLeadDetail> = {}): AdminLeadDetail {
  return {
    id: "cmi4x2k7p0000abcd1234efgh",
    type: "CARRIER_INQUIRY",
    status: "NEW",
    fullName: "Jane Driver",
    email: "jane@example.com",
    phone: "(555) 010-0001",
    companyName: "Driver Freight LLC",
    equipment: "dry-van",
    fleetSize: 3,
    inquiryType: null,
    createdAt: "2026-11-10T10:00:00.000Z",
    updatedAt: "2026-11-11T10:00:00.000Z",
    mcNumber: "123456",
    dotNumber: "7654321",
    preferredLanes: "Midwest to Southeast",
    subject: null,
    message: "Looking for steady loads.\nCall after 5pm.",
    sourcePage: "/get-started",
    notifiedAt: "2026-11-10T10:00:05.000Z",
    confirmationSentAt: "2026-11-10T10:00:06.000Z",
    contactedAt: null,
    notes: [],
    activity: [],
    ...overrides,
  };
}

function contact(overrides: Partial<AdminLeadDetail> = {}): AdminLeadDetail {
  return carrier({
    type: "CONTACT",
    fullName: "Sam Broker",
    email: "sam@example.com",
    phone: null,
    companyName: null,
    equipment: null,
    fleetSize: null,
    mcNumber: null,
    dotNumber: null,
    preferredLanes: null,
    inquiryType: "PRICING",
    subject: "Rates for a small fleet",
    message: "How does your fee work?",
    sourcePage: "/contact",
    ...overrides,
  });
}

/** The value shown next to a label, within one panel. */
function value(region: HTMLElement, label: string) {
  return within(region).getByText(label, { selector: "dt" }).nextElementSibling;
}

const panel = (name: string) => screen.getByRole("region", { name });

describe("LeadDetailView: carrier inquiry", () => {
  it("has a back link, a clear page heading and the type", () => {
    render(<LeadDetailView lead={carrier()} />);
    expect(screen.getByRole("link", { name: "Back to leads" })).toHaveAttribute(
      "href",
      "/admin/leads",
    );
    expect(screen.getByRole("heading", { level: 1, name: "Jane Driver" })).toBeInTheDocument();
    expect(screen.getByText("Carrier inquiry")).toBeInTheDocument();
  });

  it("groups identity, contact and company information", () => {
    render(<LeadDetailView lead={carrier()} />);
    const contactPanel = panel("Contact");
    expect(value(contactPanel, "Full name")).toHaveTextContent("Jane Driver");
    expect(value(contactPanel, "Email")).toHaveTextContent("jane@example.com");
    expect(value(contactPanel, "Phone")).toHaveTextContent("(555) 010-0001");
    expect(value(contactPanel, "Company")).toHaveTextContent("Driver Freight LLC");
  });

  it("links the email and phone", () => {
    render(<LeadDetailView lead={carrier()} />);
    expect(screen.getByRole("link", { name: "jane@example.com" })).toHaveAttribute(
      "href",
      "mailto:jane@example.com",
    );
    expect(screen.getByRole("link", { name: "(555) 010-0001" })).toHaveAttribute(
      "href",
      "tel:5550100001",
    );
  });

  it("shows MC and DOT numbers, equipment, fleet size and preferred lanes", () => {
    render(<LeadDetailView lead={carrier()} />);
    const carrierPanel = panel("Carrier details");
    expect(value(carrierPanel, "MC number")).toHaveTextContent("123456");
    expect(value(carrierPanel, "DOT number")).toHaveTextContent("7654321");

    const equipment = panel("Equipment");
    expect(value(equipment, "Equipment type")).toHaveTextContent("Dry Van");
    expect(value(equipment, "Fleet size")).toHaveTextContent("3");
    expect(value(equipment, "Preferred lanes")).toHaveTextContent("Midwest to Southeast");
  });

  it("shows the message with its line breaks preserved, and does not show contact-only fields", () => {
    render(<LeadDetailView lead={carrier()} />);
    const message = panel("Additional message");
    expect(within(message).getByText(/Looking for steady loads/).tagName).toBe("P");
    expect(within(message).getByText(/Looking for steady loads/)).toHaveClass(
      "whitespace-pre-wrap",
    );
    expect(within(message).queryByText("Topic")).not.toBeInTheDocument();
    expect(within(message).queryByText("Subject")).not.toBeInTheDocument();
  });

  it("shows every date and the source page", () => {
    render(<LeadDetailView lead={carrier({ contactedAt: "2026-11-12T08:00:00.000Z" })} />);
    const details = panel("Details");
    for (const label of ["Submitted", "Last updated", "First contacted"]) {
      expect(value(details, label)!.querySelector("time")).not.toBeNull();
    }
    expect(value(details, "Submitted from")).toHaveTextContent("/get-started");
  });
});

describe("LeadDetailView: contact message", () => {
  it("shows the topic, subject and message, and no carrier-only panels", () => {
    render(<LeadDetailView lead={contact()} />);
    expect(screen.getByText("Contact message", { selector: "p" })).toBeInTheDocument();
    const message = panel("Message");
    expect(value(message, "Topic")).toHaveTextContent("Pricing");
    expect(value(message, "Subject")).toHaveTextContent("Rates for a small fleet");
    expect(within(message).getByText("How does your fee work?")).toBeInTheDocument();

    expect(screen.queryByRole("region", { name: "Carrier details" })).not.toBeInTheDocument();
    expect(screen.queryByText("MC number")).not.toBeInTheDocument();
    expect(screen.queryByText("Preferred lanes")).not.toBeInTheDocument();
    // No equipment given, so the equipment panel is not shown either.
    expect(screen.queryByRole("region", { name: "Equipment" })).not.toBeInTheDocument();
  });

  it("shows equipment and fleet size when a contact message mentions them", () => {
    render(<LeadDetailView lead={contact({ equipment: "reefer", fleetSize: 4 })} />);
    const equipment = panel("Equipment");
    expect(value(equipment, "Equipment type")).toHaveTextContent("Reefer");
    expect(value(equipment, "Fleet size")).toHaveTextContent("4");
    expect(within(equipment).queryByText("Preferred lanes")).not.toBeInTheDocument();
  });
});

describe("LeadDetailView: missing and optional values", () => {
  it('shows "Not provided" for missing contact, company and carrier fields', () => {
    render(
      <LeadDetailView
        lead={carrier({
          phone: null,
          companyName: null,
          mcNumber: null,
          dotNumber: null,
          equipment: null,
          fleetSize: null,
          preferredLanes: null,
          message: null,
        })}
      />,
    );
    expect(within(panel("Contact")).getAllByText("Not provided")).toHaveLength(2);
    expect(within(panel("Carrier details")).getAllByText("Not provided")).toHaveLength(2);
    expect(within(panel("Equipment")).getAllByText("Not provided")).toHaveLength(3);
    expect(within(panel("Additional message")).getByText("Not provided")).toBeInTheDocument();
    expect(within(panel("Details")).getAllByText("Not provided").length).toBeGreaterThanOrEqual(1);
    // The empty marker is hidden from the visible dash for screen readers' sake: text is spoken.
    expect(screen.queryByRole("link", { name: /tel:/ })).not.toBeInTheDocument();
  });

  it("keeps a fleet size of zero-like values visible and does not treat 0 as missing", () => {
    render(<LeadDetailView lead={carrier({ fleetSize: 0 })} />);
    expect(value(panel("Equipment"), "Fleet size")).toHaveTextContent("0");
  });

  it("falls back to the stored text for an equipment value it does not know", () => {
    render(<LeadDetailView lead={carrier({ equipment: "hovercraft" })} />);
    expect(value(panel("Equipment"), "Equipment type")).toHaveTextContent("hovercraft");
  });

  it("shows no topic when a contact message has no inquiry type", () => {
    render(<LeadDetailView lead={contact({ inquiryType: null, subject: null })} />);
    const message = panel("Message");
    expect(within(message).getAllByText("Not provided")).toHaveLength(2);
  });
});

describe("LeadDetailView: status", () => {
  it.each(leadStatuses)("shows the $label status with its description", (status) => {
    render(<LeadDetailView lead={carrier({ status: status.value })} />);
    const statusPanel = panel("Status");
    expect(within(statusPanel).getByText(status.label)).toBeInTheDocument();
    expect(within(statusPanel).getByText(status.description)).toBeInTheDocument();
    // The header badge repeats it, with a "Status:" prefix only screen readers hear.
    expect(screen.getByText("Status:", { selector: ".sr-only" })).toBeInTheDocument();
    expect(screen.getAllByText(status.label).length).toBeGreaterThanOrEqual(2);
  });

  it("uses the shared status tone classes for the badge", () => {
    render(<LeadDetailView lead={carrier({ status: "SPAM" })} />);
    const badge = within(panel("Status")).getByText("Spam");
    expect(badge.className).toMatch(/destructive/);
  });
});

describe("LeadDetailView: notes and activity (read-only)", () => {
  const notes = [
    {
      id: "n2",
      body: "Called and left a voicemail.\nWill try again Monday.",
      author: { id: "u1", name: "Abdul Muqeet" },
      createdAt: "2026-11-12T10:00:00.000Z",
      updatedAt: "2026-11-13T10:00:00.000Z",
      canEdit: true,
    },
    {
      id: "n1",
      body: "Imported from the old notes field.",
      author: null,
      createdAt: "2026-11-11T10:00:00.000Z",
      updatedAt: "2026-11-11T10:00:00.000Z",
      canEdit: false,
    },
  ];

  it("shows each note with its author, time and an edited marker", () => {
    render(<LeadDetailView lead={carrier({ notes })} />);
    const list = within(panel("Notes")).getByRole("list");
    const [first, second] = within(list).getAllByRole("listitem");
    expect(first).toHaveTextContent("Called and left a voicemail.");
    expect(first).toHaveTextContent("Abdul Muqeet");
    expect(first).toHaveTextContent("edited");
    expect(first!.querySelectorAll("time")).toHaveLength(2);
    expect(within(first!).getByText(/Called and left/)).toHaveClass("whitespace-pre-wrap");

    // A legacy note has no author and is shown, not hidden.
    expect(second).toHaveTextContent("Imported from the old notes field.");
    expect(second).toHaveTextContent("A former team member");
    expect(second).not.toHaveTextContent("edited");
  });

  it("says there are no notes when there are none", () => {
    render(<LeadDetailView lead={carrier({ notes: [] })} />);
    expect(within(panel("Notes")).getByText("No notes yet.")).toBeInTheDocument();
    expect(within(panel("Notes")).queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows the activity timeline with status changes and the email events", () => {
    render(
      <LeadDetailView
        lead={carrier({
          status: "CONTACTED",
          contactedAt: "2026-11-12T08:00:00.000Z",
          activity: [
            {
              id: "a1",
              action: "STATUS_CHANGED",
              actor: { id: "u1", name: "Abdul Muqeet" },
              fromStatus: "NEW",
              toStatus: "CONTACTED",
              noteId: null,
              createdAt: "2026-11-12T08:00:00.000Z",
            },
          ],
        })}
      />,
    );
    const timeline = within(panel("Activity")).getByRole("list");
    expect(timeline.tagName).toBe("OL");
    expect(within(timeline).getByText("Status changed from New to Contacted")).toBeInTheDocument();
    expect(within(timeline).getByText("Abdul Muqeet")).toBeInTheDocument();
    expect(within(timeline).getByText("Carrier inquiry submitted")).toBeInTheDocument();
    expect(within(timeline).getByText("Team notification email sent")).toBeInTheDocument();
  });

  it('shows "not sent" for emails that never went out, without a time', () => {
    render(<LeadDetailView lead={carrier({ notifiedAt: null, confirmationSentAt: null })} />);
    const timeline = within(panel("Activity")).getByRole("list");
    const warning = within(timeline).getByText("Team notification email was not sent");
    expect(warning.closest("li")!.querySelector("time")).toBeNull();
    expect(
      within(timeline).getByText("Confirmation email to the submitter was not sent"),
    ).toBeInTheDocument();
  });

  it("is read-only: no forms, inputs, buttons or editing controls anywhere", () => {
    const { container } = render(
      <LeadDetailView
        lead={carrier({
          notes,
          activity: [
            {
              id: "a1",
              action: "NOTE_ADDED",
              actor: null,
              fromStatus: null,
              toStatus: null,
              noteId: "n1",
              createdAt: "2026-11-12T08:00:00.000Z",
            },
          ],
        })}
      />,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(container.querySelector("form, input, select, textarea, button")).toBeNull();
    // The only links are the back link and the contact links.
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs.every((href) => href === "/admin/leads" || /^(mailto|tel):/.test(href!))).toBe(
      true,
    );
  });
});

describe("LeadDetailView: privacy", () => {
  it("renders only the detail fields even if the lead object carried private ones", () => {
    const leaky = {
      ...carrier(),
      ipHash: "leaked-ip-hash",
      userAgent: "leaked-agent",
      submissionId: "leaked-submission",
      legacyNotes: "leaked legacy note",
      password: "leaked-password",
      token: "leaked-token",
    } as AdminLeadDetail;
    const { container } = render(<LeadDetailView lead={leaky} />);
    expect(container.innerHTML).not.toMatch(/leaked/);
  });

  it("does not put the lead's id in the visible text", () => {
    const { container } = render(<LeadDetailView lead={carrier()} />);
    expect(container.textContent).not.toContain("cmi4x2k7p0000abcd1234efgh");
  });
});

describe("LeadDetailView: accessibility and layout markup", () => {
  it("is an article labelled by the page heading, with a labelled region per section", () => {
    render(<LeadDetailView lead={carrier()} />);
    expect(screen.getByRole("article", { name: "Jane Driver" })).toBeInTheDocument();
    const names = screen
      .getAllByRole("region")
      .map((region) => region.getAttribute("aria-labelledby"));
    expect(names.every(Boolean)).toBe(true);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThanOrEqual(6);
  });

  it("uses valid description lists: groups hold only a term and a value", () => {
    const { container } = render(<LeadDetailView lead={carrier()} />);
    for (const list of container.querySelectorAll("dl")) {
      for (const child of list.children) {
        if (child.tagName === "DIV") {
          expect([...child.children].map((c) => c.tagName)).toEqual(["DT", "DD"]);
        } else {
          expect(["DT", "DD"]).toContain(child.tagName);
        }
      }
    }
  });

  it("collapses to one column on small screens and splits into main and side columns on large ones", () => {
    const { container } = render(<LeadDetailView lead={carrier()} />);
    const grid = container.querySelector(".grid.gap-6")!;
    expect(grid).toHaveClass("lg:grid-cols-3");
    expect(grid.firstElementChild).toHaveClass("lg:col-span-2");
  });

  it("wraps long text instead of overflowing the page", () => {
    render(
      <LeadDetailView
        lead={carrier({ fullName: "x".repeat(200), email: `${"y".repeat(120)}@example.com` })}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("[overflow-wrap:anywhere]");
    expect(value(panel("Contact"), "Email")).toHaveClass("[overflow-wrap:anywhere]");
  });
});

describe("BackToLeads and the loading skeleton", () => {
  it("links back to the list", () => {
    render(<BackToLeads />);
    expect(screen.getByRole("link", { name: "Back to leads" })).toHaveAttribute(
      "href",
      "/admin/leads",
    );
  });

  it("announces the skeleton once as loading", () => {
    render(<LeadDetailSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading lead");
  });
});
