// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { leadStatusValues } from "@/content/lead-status";
import { evaluateAdminSession, type AdminContext } from "@/lib/admin-guard";
import {
  getDashboardStats,
  getLead,
  listLeads,
  updateLeadStatus,
} from "@/services/admin-lead.service";
import { leadListQuerySchema } from "@/validations/admin-leads";

/**
 * Regression: after a status change the detail page, the dashboard counts and
 * the leads list all agree, the activity trail records it, and notes and other
 * leads are untouched. Runs the REAL services against a small in-memory fake of
 * the database (the Prisma calls the services make), so the pieces are tested
 * together rather than each with its own mock.
 */

type Row = {
  id: string;
  type: "CARRIER_INQUIRY" | "CONTACT";
  status: string;
  fullName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  contactedAt: Date | null;
  [key: string]: unknown;
};

const state = vi.hoisted(() => ({
  leads: [] as unknown[],
  notes: [] as unknown[],
  activities: [] as unknown[],
  nextId: 1,
}));

const rows = () => state.leads as Row[];

const fakeDb = {
  lead: {
    findMany: async ({
      where = {},
      orderBy,
      skip = 0,
      take,
    }: {
      where?: Record<string, unknown>;
      orderBy: Record<string, "asc" | "desc">[];
      skip?: number;
      take?: number;
    }) => {
      const [{ ...first }] = orderBy;
      const [field, dir] = Object.entries(first)[0]!;
      const matches = rows().filter((row) =>
        Object.entries(where).every(([key, value]) => row[key] === value),
      );
      matches.sort((a, b) => {
        const left = (a[field] as Date | string).valueOf();
        const right = (b[field] as Date | string).valueOf();
        return dir === "asc" ? (left < right ? -1 : 1) : left < right ? 1 : -1;
      });
      return matches.slice(skip, take === undefined ? undefined : skip + take);
    },
    count: async ({ where = {} }: { where?: Record<string, unknown> } = {}) =>
      rows().filter((row) => Object.entries(where).every(([key, value]) => row[key] === value))
        .length,
    groupBy: async () => {
      const groups = new Map<string, { status: string; type: string; _count: { _all: number } }>();
      for (const row of rows()) {
        const key = `${row.status}|${row.type}`;
        const group = groups.get(key) ?? {
          status: row.status,
          type: row.type,
          _count: { _all: 0 },
        };
        group._count._all += 1;
        groups.set(key, group);
      }
      return [...groups.values()];
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const row = rows().find((candidate) => candidate.id === where.id);
      if (!row) return null;
      return {
        ...row,
        leadNotes: (state.notes as { leadId: string }[]).filter((note) => note.leadId === row.id),
        activities: (state.activities as { leadId: string; createdAt: Date }[])
          .filter((entry) => entry.leadId === row.id)
          .sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf()),
      };
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string; status: string };
      data: Record<string, unknown>;
    }) => {
      const row = rows().find((r) => r.id === where.id && r.status === where.status);
      if (!row) throw Object.assign(new Error("Record to update not found."), { code: "P2025" });
      Object.assign(row, data, { updatedAt: new Date(row.updatedAt.valueOf() + 1000) });
      return row;
    },
  },
  leadActivity: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      state.activities.push({
        id: `act_${state.nextId++}`,
        noteId: null,
        createdAt: new Date(Date.now() + state.nextId),
        actor: { id: data.actorId, name: "Abdul Muqeet" },
        ...data,
      });
    },
  },
  $transaction: async (work: (tx: unknown) => unknown) => work(fakeDb),
};

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => true,
  getPrisma: () => fakeDb,
}));

const ADMIN_EMAIL = "admin@haulix.test";

function makeAdmin(): AdminContext {
  const result = evaluateAdminSession({
    session: { id: "s", userId: "user_admin", expiresAt: new Date(Date.now() + 60_000) },
    user: { id: "user_admin", email: ADMIN_EMAIL, name: "Abdul Muqeet", role: "admin" },
  });
  if (!result.ok) throw new Error("test admin was not authorized");
  return result.admin;
}

const IDS = ["cmi4x2k7p0000aaaa1111aaaa", "cmi4x2k7p0000bbbb2222bbbb", "cmi4x2k7p0000cccc3333cccc"];

function seed() {
  const base = Date.parse("2026-11-01T00:00:00Z");
  const make = (index: number, status: string, type: Row["type"]): Row => ({
    id: IDS[index]!,
    type,
    status,
    fullName: `Lead ${index}`,
    email: `lead${index}@example.com`,
    phone: null,
    companyName: null,
    equipment: null,
    fleetSize: null,
    inquiryType: null,
    createdAt: new Date(base + index * 86_400_000),
    updatedAt: new Date(base + index * 86_400_000),
    contactedAt: null,
    ipHash: "leaked-ip-hash",
    submissionId: `leaked-${index}`,
  });
  state.leads = [
    make(0, "NEW", "CARRIER_INQUIRY"),
    make(1, "NEW", "CONTACT"),
    make(2, "CONTACTED", "CARRIER_INQUIRY"),
  ];
  state.notes = [
    {
      id: "note_1",
      leadId: IDS[0],
      body: "Original note",
      authorId: null,
      author: null,
      createdAt: new Date("2026-11-02T00:00:00Z"),
      updatedAt: new Date("2026-11-02T00:00:00Z"),
    },
  ];
  state.activities = [];
  state.nextId = 1;
}

const query = (input: Record<string, string> = {}) => leadListQuerySchema.parse(input);

async function stats() {
  const result = await getDashboardStats(makeAdmin());
  if (!result.ok) throw new Error("stats failed");
  return result.data;
}

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", ADMIN_EMAIL);
  seed();
});

afterEach(() => vi.unstubAllEnvs());

describe("after a status change, every view agrees", () => {
  it("moves the lead between the dashboard's status counts and keeps the total", async () => {
    const before = await stats();
    expect(before.byStatus).toMatchObject({ NEW: 2, CONTACTED: 1, SPAM: 0 });

    const result = await updateLeadStatus(makeAdmin(), IDS[0]!, {
      status: "SPAM",
      expectedStatus: "NEW",
    });
    expect(result).toMatchObject({ ok: true, data: { changed: true, lead: { status: "SPAM" } } });

    const after = await stats();
    expect(after.byStatus).toMatchObject({ NEW: 1, CONTACTED: 1, SPAM: 1 });
    // Spam still counts toward the total, and the type split is unchanged.
    expect(after.totalLeads).toBe(before.totalLeads);
    expect(after.byType).toEqual(before.byType);
  });

  it("shows the new status in the leads list, in the recent leads, and in the filters", async () => {
    await updateLeadStatus(makeAdmin(), IDS[0]!, { status: "REJECTED" });

    const all = await listLeads(makeAdmin(), query());
    if (!all.ok) throw new Error("list failed");
    expect(all.data.leads.find((lead) => lead.id === IDS[0])?.status).toBe("REJECTED");
    expect(all.data.total).toBe(3);

    const rejected = await listLeads(makeAdmin(), query({ status: "REJECTED" }));
    expect(rejected).toMatchObject({ ok: true, data: { total: 1, leads: [{ id: IDS[0] }] } });

    const stillNew = await listLeads(makeAdmin(), query({ status: "NEW" }));
    if (!stillNew.ok) throw new Error("list failed");
    expect(stillNew.data.leads.map((lead) => lead.id)).toEqual([IDS[1]]);

    // Sorting and type filters keep working with the changed data.
    const sorted = await listLeads(makeAdmin(), query({ sort: "createdAt", dir: "asc" }));
    if (!sorted.ok) throw new Error("list failed");
    expect(sorted.data.leads.map((lead) => lead.id)).toEqual(IDS);
    const carriers = await listLeads(
      makeAdmin(),
      query({ type: "CARRIER_INQUIRY", status: "REJECTED" }),
    );
    expect(carriers).toMatchObject({ ok: true, data: { total: 1 } });

    const data = await stats();
    expect(data.recentLeads.find((lead) => lead.id === IDS[0])?.status).toBe("REJECTED");
  });

  it("shows the change on the detail view, with who made it, and keeps the notes intact", async () => {
    await updateLeadStatus(makeAdmin(), IDS[0]!, { status: "CONTACTED" });

    const detail = await getLead(makeAdmin(), IDS[0]!);
    if (!detail.ok) throw new Error("detail failed");
    expect(detail.data.status).toBe("CONTACTED");
    expect(detail.data.activity).toHaveLength(1);
    expect(detail.data.activity[0]).toMatchObject({
      action: "STATUS_CHANGED",
      fromStatus: "NEW",
      toStatus: "CONTACTED",
      actor: { name: "Abdul Muqeet" },
    });
    // The existing note is exactly as it was.
    expect(detail.data.notes).toHaveLength(1);
    expect(detail.data.notes[0]).toMatchObject({ id: "note_1", body: "Original note" });
    expect(state.notes).toHaveLength(1);
  });

  it("sets contactedAt once, on the first move to Contacted, and keeps it afterwards", async () => {
    await updateLeadStatus(makeAdmin(), IDS[0]!, { status: "CONTACTED" });
    const firstContact = rows()[0]!.contactedAt;
    expect(firstContact).toBeInstanceOf(Date);

    await updateLeadStatus(makeAdmin(), IDS[0]!, { status: "QUALIFIED" });
    await updateLeadStatus(makeAdmin(), IDS[0]!, { status: "CONTACTED" });
    expect(rows()[0]!.contactedAt).toBe(firstContact);
  });

  it("changes only the one lead", async () => {
    const others = JSON.stringify([rows()[1], rows()[2]]);
    await updateLeadStatus(makeAdmin(), IDS[0]!, { status: "SPAM" });
    expect(JSON.stringify([rows()[1], rows()[2]])).toBe(others);
    expect(state.activities).toHaveLength(1);
  });
});

describe("walking a lead through every status", () => {
  it("keeps the totals right and logs each change in order, but not repeats", async () => {
    const order = ["CONTACTED", "QUALIFIED", "ONBOARDED", "REJECTED", "SPAM", "NEW"] as const;
    let previous = "NEW";
    for (const next of order) {
      const result = await updateLeadStatus(makeAdmin(), IDS[0]!, {
        status: next,
        expectedStatus: previous as "NEW",
      });
      expect(result).toMatchObject({ ok: true, data: { changed: true } });

      const data = await stats();
      expect(data.totalLeads).toBe(3);
      expect(Object.values(data.byStatus).reduce((a, b) => a + b, 0)).toBe(3);
      expect(data.byStatus[next as keyof typeof data.byStatus]).toBeGreaterThanOrEqual(1);
      previous = next;
    }
    expect(state.activities).toHaveLength(6);
    expect(
      (state.activities as { fromStatus: string; toStatus: string }[]).map((a) => [
        a.fromStatus,
        a.toStatus,
      ]),
    ).toEqual([
      ["NEW", "CONTACTED"],
      ["CONTACTED", "QUALIFIED"],
      ["QUALIFIED", "ONBOARDED"],
      ["ONBOARDED", "REJECTED"],
      ["REJECTED", "SPAM"],
      ["SPAM", "NEW"],
    ]);

    // A repeat changes nothing and logs nothing.
    const again = await updateLeadStatus(makeAdmin(), IDS[0]!, { status: "NEW" });
    expect(again).toMatchObject({ ok: true, data: { changed: false } });
    expect(state.activities).toHaveLength(6);
  });

  it("includes every status, Rejected and Spam too, in the dashboard after moves", async () => {
    await updateLeadStatus(makeAdmin(), IDS[0]!, { status: "REJECTED" });
    await updateLeadStatus(makeAdmin(), IDS[1]!, { status: "SPAM" });
    const data = await stats();
    expect(data.byStatus).toEqual({
      NEW: 0,
      CONTACTED: 1,
      QUALIFIED: 0,
      ONBOARDED: 0,
      REJECTED: 1,
      SPAM: 1,
    });
    expect(data.totalLeads).toBe(3);
    expect(Object.keys(data.byStatus)).toEqual([...leadStatusValues]);
  });

  it("refuses a stale update without changing anything", async () => {
    await updateLeadStatus(makeAdmin(), IDS[0]!, { status: "CONTACTED" });
    const stale = await updateLeadStatus(makeAdmin(), IDS[0]!, {
      status: "SPAM",
      expectedStatus: "NEW",
    });
    expect(stale).toEqual({ ok: false, reason: "conflict" });
    expect(rows()[0]!.status).toBe("CONTACTED");
    expect(state.activities).toHaveLength(1);
  });
});

describe("private data stays private through all of it", () => {
  it("never leaks private columns from the list, dashboard, detail or update responses", async () => {
    const update = await updateLeadStatus(makeAdmin(), IDS[0]!, { status: "QUALIFIED" });
    const outputs = [
      update,
      await listLeads(makeAdmin(), query()),
      await getDashboardStats(makeAdmin()),
      await getLead(makeAdmin(), IDS[0]!),
    ];
    expect(JSON.stringify(outputs)).not.toMatch(/leaked|ipHash|submissionId/);
  });
});
