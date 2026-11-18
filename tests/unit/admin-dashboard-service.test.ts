// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LeadStatus, LeadType } from "@/generated/prisma/enums";
import { AdminAccessError, evaluateAdminSession, type AdminContext } from "@/lib/admin-guard";
import {
  getDashboardStats,
  RECENT_LEADS_LIMIT,
  summarizeLeadCounts,
  type LeadCountRow,
} from "@/services/admin-lead.service";

const mocks = vi.hoisted(() => ({
  groupBy: vi.fn(),
  findMany: vi.fn(),
  configured: { value: true },
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => mocks.configured.value,
  getPrisma: () => ({ lead: { groupBy: mocks.groupBy, findMany: mocks.findMany } }),
}));

const ADMIN_EMAIL = "admin@haulix.test";

function makeAdmin(): AdminContext {
  const result = evaluateAdminSession({
    session: { id: "s", userId: "u", expiresAt: new Date(Date.now() + 60_000) },
    user: { id: "u", email: ADMIN_EMAIL, name: "Admin", role: "admin" },
  });
  if (!result.ok) throw new Error("test admin was not authorized");
  return result.admin;
}

const count = (status: string, type: string, n: number) =>
  ({ status, type, _count: { _all: n } }) as LeadCountRow;

function lead(id: string, createdAt: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    type: "CARRIER_INQUIRY",
    status: "NEW",
    fullName: `Lead ${id}`,
    email: `${id}@example.com`,
    phone: null,
    companyName: null,
    equipment: null,
    fleetSize: null,
    inquiryType: null,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
    ...extra,
  };
}

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", ADMIN_EMAIL);
  mocks.configured.value = true;
  mocks.groupBy.mockResolvedValue([]);
  mocks.findMany.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  mocks.groupBy.mockReset();
  mocks.findMany.mockReset();
});

describe("summarizeLeadCounts", () => {
  it("returns zeros for every status and type when there are no leads", () => {
    const summary = summarizeLeadCounts([]);
    expect(summary.totalLeads).toBe(0);
    expect(Object.keys(summary.byStatus)).toEqual(Object.values(LeadStatus));
    expect(Object.values(summary.byStatus).every((value) => value === 0)).toBe(true);
    expect(Object.keys(summary.byType).sort()).toEqual(Object.values(LeadType).sort());
    expect(Object.values(summary.byType).every((value) => value === 0)).toBe(true);
  });

  it("counts every status, and the total includes Rejected and Spam", () => {
    const summary = summarizeLeadCounts([
      count("NEW", "CARRIER_INQUIRY", 5),
      count("NEW", "CONTACT", 2),
      count("CONTACTED", "CARRIER_INQUIRY", 4),
      count("QUALIFIED", "CARRIER_INQUIRY", 3),
      count("ONBOARDED", "CARRIER_INQUIRY", 1),
      count("REJECTED", "CONTACT", 6),
      count("SPAM", "CONTACT", 9),
    ]);

    expect(summary.byStatus).toEqual({
      NEW: 7,
      CONTACTED: 4,
      QUALIFIED: 3,
      ONBOARDED: 1,
      REJECTED: 6,
      SPAM: 9,
    });
    expect(summary.totalLeads).toBe(30);
    expect(summary.byType).toEqual({ CARRIER_INQUIRY: 13, CONTACT: 17 });
    // The total equals the sum of each breakdown.
    const sum = (record: Record<string, number>) => Object.values(record).reduce((a, b) => a + b);
    expect(sum(summary.byStatus)).toBe(summary.totalLeads);
    expect(sum(summary.byType)).toBe(summary.totalLeads);
  });

  it("counts a database with only Rejected and Spam leads", () => {
    const summary = summarizeLeadCounts([
      count("REJECTED", "CARRIER_INQUIRY", 2),
      count("SPAM", "CONTACT", 3),
    ]);
    expect(summary.totalLeads).toBe(5);
    expect(summary.byStatus.NEW).toBe(0);
    expect(summary.byStatus.REJECTED).toBe(2);
    expect(summary.byStatus.SPAM).toBe(3);
  });

  it("ignores unknown values and impossible counts instead of trusting them", () => {
    const summary = summarizeLeadCounts([
      count("ARCHIVED", "CARRIER_INQUIRY", 4),
      count("NEW", "NEWSLETTER", 4),
      count("NEW", "CONTACT", -1),
      count("NEW", "CONTACT", 1.5),
      count("__proto__", "CONTACT", 1),
      count("NEW", "CONTACT", 2),
    ]);
    expect(summary.totalLeads).toBe(2);
    expect(summary.byStatus.NEW).toBe(2);
    expect(summary.byType.CONTACT).toBe(2);
  });
});

describe("getDashboardStats", () => {
  it.each([undefined, null, {}, { userId: "u", email: ADMIN_EMAIL, name: "A", sessionId: "s" }])(
    "refuses a missing or forged admin context (%j) before touching the database",
    async (forged) => {
      await expect(getDashboardStats(forged)).rejects.toBeInstanceOf(AdminAccessError);
      expect(mocks.groupBy).not.toHaveBeenCalled();
      expect(mocks.findMany).not.toHaveBeenCalled();
    },
  );

  it("refuses an admin removed from ADMIN_EMAILS", async () => {
    const admin = makeAdmin();
    vi.stubEnv("ADMIN_EMAILS", "someone-else@haulix.test");
    await expect(getDashboardStats(admin)).rejects.toMatchObject({ denial: "forbidden" });
    expect(mocks.groupBy).not.toHaveBeenCalled();
  });

  it("uses one grouped count and one capped, newest-first list", async () => {
    await getDashboardStats(makeAdmin());

    expect(mocks.groupBy).toHaveBeenCalledTimes(1);
    expect(mocks.groupBy).toHaveBeenCalledWith({
      by: ["status", "type"],
      _count: { _all: true },
    });
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    const args = mocks.findMany.mock.calls[0]![0];
    expect(args.take).toBe(RECENT_LEADS_LIMIT);
    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    expect(args.where).toBeUndefined();
  });

  it("selects only safe summary columns for the recent leads", async () => {
    await getDashboardStats(makeAdmin());
    const { select } = mocks.findMany.mock.calls[0]![0];
    expect(Object.keys(select).sort()).toEqual(
      [
        "companyName",
        "createdAt",
        "email",
        "equipment",
        "fleetSize",
        "fullName",
        "id",
        "inquiryType",
        "phone",
        "status",
        "type",
        "updatedAt",
      ].sort(),
    );
  });

  it("returns totals and the recent leads in the database's newest-first order", async () => {
    mocks.groupBy.mockResolvedValue([
      count("NEW", "CARRIER_INQUIRY", 2),
      count("SPAM", "CONTACT", 1),
    ]);
    mocks.findMany.mockResolvedValue([
      lead("c3", "2026-11-18T10:00:00Z"),
      lead("c2", "2026-11-17T10:00:00Z", { status: "SPAM", type: "CONTACT" }),
      lead("c1", "2026-11-16T10:00:00Z"),
    ]);

    const result = await getDashboardStats(makeAdmin());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.totalLeads).toBe(3);
    expect(result.data.byStatus.SPAM).toBe(1);
    expect(result.data.recentLeads.map((item) => item.id)).toEqual(["c3", "c2", "c1"]);
    expect(result.data.recentLeads[0]!.createdAt).toBe("2026-11-18T10:00:00.000Z");
  });

  it("returns an empty dashboard for an empty database", async () => {
    const result = await getDashboardStats(makeAdmin());
    expect(result).toMatchObject({ ok: true, data: { totalLeads: 0, recentLeads: [] } });
  });

  it("never returns private columns even if the database supplied them", async () => {
    mocks.findMany.mockResolvedValue([
      lead("c1", "2026-11-16T10:00:00Z", {
        ipHash: "leaked-ip",
        userAgent: "leaked-agent",
        submissionId: "leaked-submission",
        notes: "leaked note",
      }),
    ]);
    const text = JSON.stringify(await getDashboardStats(makeAdmin()));
    expect(text).not.toMatch(/leaked|ipHash|userAgent|submissionId/);
  });

  it("returns not_configured without a database", async () => {
    mocks.configured.value = false;
    await expect(getDashboardStats(makeAdmin())).resolves.toEqual({
      ok: false,
      reason: "not_configured",
    });
    expect(mocks.groupBy).not.toHaveBeenCalled();
  });

  it("returns failed, logging no personal data, when the database errors", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.groupBy.mockRejectedValue(new Error("timeout for jane@example.com"));
    await expect(getDashboardStats(makeAdmin())).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
    expect(String(error.mock.calls[0])).not.toContain("jane@example.com");
  });
});
