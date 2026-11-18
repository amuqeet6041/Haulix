// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/toast";
import { AdminAccessError, evaluateAdminSession, type AdminContext } from "@/lib/admin-guard";

/**
 * The detail page with the REAL lead service (so permission and safe-field
 * rules are exercised) and only the database, session lookup and Next's
 * notFound/link mocked.
 */

const mocks = vi.hoisted(() => ({
  requireAdminPage: vi.fn(),
  findUnique: vi.fn(),
  configured: { value: true },
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/admin-page", () => ({ requireAdminPage: mocks.requireAdminPage }));
vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => mocks.configured.value,
  getPrisma: () => ({ lead: { findUnique: mocks.findUnique } }),
}));
vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const { default: LeadDetailPage, metadata } =
  await import("@/app/admin/(protected)/leads/[id]/page");
const { default: LeadNotFound } = await import("@/app/admin/(protected)/leads/[id]/not-found");
const { default: LeadDetailError } = await import("@/app/admin/(protected)/leads/[id]/error");
const { default: LeadDetailLoading } = await import("@/app/admin/(protected)/leads/[id]/loading");

const ADMIN_EMAIL = "admin@haulix.test";
const ID = "cmi4x2k7p0000abcd1234efgh";

function makeAdmin(): AdminContext {
  const result = evaluateAdminSession({
    session: { id: "s", userId: "user_admin", expiresAt: new Date(Date.now() + 60_000) },
    user: { id: "user_admin", email: ADMIN_EMAIL, name: "Admin", role: "admin" },
  });
  if (!result.ok) throw new Error("test admin was not authorized");
  return result.admin;
}

const row = {
  id: ID,
  type: "CARRIER_INQUIRY",
  status: "QUALIFIED",
  fullName: "Jane Driver",
  email: "jane@example.com",
  phone: "(555) 010-0001",
  companyName: "Driver Freight LLC",
  equipment: "flatbed",
  fleetSize: 5,
  inquiryType: null,
  createdAt: new Date("2026-11-10T10:00:00Z"),
  updatedAt: new Date("2026-11-11T10:00:00Z"),
  mcNumber: "123456",
  dotNumber: null,
  preferredLanes: null,
  subject: null,
  message: "Looking for steady loads.",
  sourcePage: "/get-started",
  notifiedAt: null,
  confirmationSentAt: null,
  contactedAt: null,
  leadNotes: [
    {
      id: "n1",
      body: "Spoke by phone.",
      authorId: "user_admin",
      author: { id: "user_admin", name: "Admin", email: "leaked-author@example.com" },
      createdAt: new Date("2026-11-12T10:00:00Z"),
      updatedAt: new Date("2026-11-12T10:00:00Z"),
    },
  ],
  activities: [
    {
      id: "a1",
      action: "STATUS_CHANGED",
      actor: { id: "user_admin", name: "Admin" },
      fromStatus: "NEW",
      toStatus: "QUALIFIED",
      noteId: null,
      metadata: { previousBody: "leaked metadata" },
      createdAt: new Date("2026-11-12T11:00:00Z"),
    },
  ],
  // Private columns a careless query could return.
  ipHash: "leaked-ip-hash",
  userAgent: "leaked-user-agent",
  submissionId: "leaked-submission-id",
  notes: "leaked legacy notes column",
};

const props = (id: string) => ({ params: Promise.resolve({ id }) });
// The admin shell provides toasts to every page; the page test supplies them itself.
const html = async (id = ID) =>
  renderToStaticMarkup(<ToastProvider>{await LeadDetailPage(props(id))}</ToastProvider>);

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", ADMIN_EMAIL);
  mocks.configured.value = true;
  mocks.requireAdminPage.mockResolvedValue(makeAdmin());
  mocks.findUnique.mockResolvedValue(row);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  mocks.requireAdminPage.mockReset();
  mocks.findUnique.mockReset();
  mocks.notFound.mockClear();
});

describe("/admin/leads/[id]: authentication and permission", () => {
  it("redirects visitors who are not admins before touching the database", async () => {
    mocks.requireAdminPage.mockRejectedValue(new Error("REDIRECT:/admin/login"));
    await expect(LeadDetailPage(props(ID))).rejects.toThrow("REDIRECT:/admin/login");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("refuses a forged admin context even if the page check were bypassed", async () => {
    mocks.requireAdminPage.mockResolvedValue({
      userId: "x",
      email: ADMIN_EMAIL,
      name: "A",
      sessionId: "s",
    });
    await expect(LeadDetailPage(props(ID))).rejects.toBeInstanceOf(AdminAccessError);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("refuses an admin who has just been removed from ADMIN_EMAILS", async () => {
    vi.stubEnv("ADMIN_EMAILS", "someone-else@haulix.test");
    await expect(LeadDetailPage(props(ID))).rejects.toMatchObject({ denial: "forbidden" });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("reads the lead with the lead:read service, passing only the validated id", async () => {
    await html();
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
    expect(mocks.findUnique.mock.calls[0]![0].where).toEqual({ id: ID });
  });
});

describe("/admin/leads/[id]: invalid and unknown ids", () => {
  it.each(["not-a-cuid", "seed-001", "../etc/passwd", "1", "a b c", "", "x".repeat(500)])(
    "answers not-found for the malformed id %j without querying the database",
    async (id) => {
      await expect(LeadDetailPage(props(id))).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mocks.notFound).toHaveBeenCalledTimes(1);
      expect(mocks.findUnique).not.toHaveBeenCalled();
    },
  );

  it("answers not-found for a well-formed id that does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(LeadDetailPage(props(ID))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it("gives a malformed id and a missing id exactly the same answer", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const errors: string[] = [];
    for (const id of ["not-a-cuid", ID]) {
      await LeadDetailPage(props(id)).catch((error: Error) => errors.push(error.message));
    }
    expect(errors).toEqual(["NEXT_NOT_FOUND", "NEXT_NOT_FOUND"]);
  });
});

describe("/admin/leads/[id]: rendering", () => {
  it("renders the lead with its notes and activity", async () => {
    const output = await html();
    expect(output).toContain("Jane Driver");
    expect(output).toContain("Driver Freight LLC");
    expect(output).toContain("Flatbed");
    expect(output).toContain("Spoke by phone.");
    expect(output).toContain("Status changed from New to Qualified");
    expect(output).toContain("Qualified");
    // Emails were never sent for this lead, and the timeline says so.
    expect(output).toContain("Team notification email was not sent");
  });

  it("renders a contact message with its topic and subject", async () => {
    mocks.findUnique.mockResolvedValue({
      ...row,
      type: "CONTACT",
      inquiryType: "PARTNERSHIP",
      subject: "Working together",
      message: "We would like to partner.",
      equipment: null,
      fleetSize: null,
      mcNumber: null,
      leadNotes: [],
      activities: [],
    });
    const output = await html();
    expect(output).toContain("Contact message");
    expect(output).toContain("Partnership");
    expect(output).toContain("Working together");
    expect(output).not.toContain("MC number");
  });

  it("uses a fixed page title with no lead data in it", () => {
    expect(metadata).toEqual({ title: "Lead details" });
  });
});

describe("/admin/leads/[id]: private data", () => {
  it("never renders private columns, author emails or activity metadata", async () => {
    const output = await html();
    expect(output).not.toMatch(/leaked|ipHash|userAgent|submissionId|metadata/);
  });

  it("selects only safe columns from the database", async () => {
    await html();
    const { select } = mocks.findUnique.mock.calls[0]![0];
    for (const field of ["ipHash", "userAgent", "submissionId", "notes"]) {
      expect(select).not.toHaveProperty(field);
    }
    expect(select.leadNotes.select.author).toEqual({ select: { id: true, name: true } });
    expect(select.activities.select).not.toHaveProperty("metadata");
  });
});

describe("/admin/leads/[id]: error states", () => {
  it("shows a safe error, with a way back, when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findUnique.mockRejectedValue(
      new Error("connection refused postgres://secret jane@example.com"),
    );
    const output = await html();

    expect(output).toContain("Lead unavailable");
    expect(output).toContain("Please refresh the page");
    expect(output).toContain("Back to leads");
    expect(output).not.toMatch(/postgres|secret|jane@example\.com|connection refused/);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("explains a missing database connection without technical detail", async () => {
    mocks.configured.value = false;
    const output = await html();
    expect(output).toContain("Lead unavailable");
    expect(output).toContain("not connected");
  });
});

describe("/admin/leads/[id]: not-found, loading and error pages", () => {
  it("not-found page names the problem and links back to the list", () => {
    const output = renderToStaticMarkup(<LeadNotFound />);
    expect(output).toContain("Lead not found");
    expect(output).toContain('href="/admin/leads"');
    expect(output).toContain("<h1");
  });

  it("loading page is a labelled loading status", () => {
    const output = renderToStaticMarkup(<LeadDetailLoading />);
    expect(output).toContain('role="status"');
    expect(output).toContain("Loading lead");
  });

  it("error page is a generic alert and never shows the error", () => {
    const output = renderToStaticMarkup(
      <LeadDetailError
        error={Object.assign(new Error("postgres://secret failure"), { digest: "d1g3st" })}
        retry={() => {}}
      />,
    );
    expect(output).toContain('role="alert"');
    expect(output).toContain("Try again");
    expect(output).toContain("Back to leads");
    expect(output).not.toMatch(/postgres|secret|d1g3st/);
  });
});
