// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAccessError, evaluateAdminSession, type AdminContext } from "@/lib/admin-guard";
import {
  buildLeadOrderBy,
  buildLeadWhere,
  DETAIL_ACTIVITY_LIMIT,
  DETAIL_NOTES_LIMIT,
  escapeLikePattern,
  getLead,
  LEAD_SEARCH_FIELDS,
  listLeads,
} from "@/services/admin-lead.service";
import {
  LEAD_PAGE_SIZES,
  LEAD_SORT_FIELDS,
  leadListQuerySchema,
  type LeadListQuery,
} from "@/validations/admin-leads";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  findUnique: vi.fn(),
  configured: { value: true },
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => mocks.configured.value,
  getPrisma: () => ({
    lead: { findMany: mocks.findMany, count: mocks.count, findUnique: mocks.findUnique },
  }),
}));

const ADMIN_EMAIL = "admin@haulix.test";

function makeAdmin(userId = "user_admin"): AdminContext {
  const result = evaluateAdminSession({
    session: { id: "sess_1", userId, expiresAt: new Date(Date.now() + 60_000) },
    user: { id: userId, email: ADMIN_EMAIL, name: "Admin", role: "admin" },
  });
  if (!result.ok) throw new Error("test admin was not authorized");
  return result.admin;
}

const query = (input: Record<string, string> = {}): LeadListQuery =>
  leadListQuerySchema.parse(input);

/** A row as the database could return it if a query ever selected too much. */
const leakyRow = {
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
  createdAt: new Date("2026-11-10T10:00:00Z"),
  updatedAt: new Date("2026-11-11T10:00:00Z"),
  ipHash: "leaked-ip-hash",
  userAgent: "leaked-user-agent",
  submissionId: "leaked-submission-id",
  notes: "leaked legacy note",
};

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", ADMIN_EMAIL);
  mocks.configured.value = true;
  mocks.findMany.mockResolvedValue([]);
  mocks.count.mockResolvedValue(0);
  mocks.findUnique.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  mocks.findMany.mockReset();
  mocks.count.mockReset();
  mocks.findUnique.mockReset();
});

describe("authorization", () => {
  it.each([
    undefined,
    null,
    "admin",
    {},
    { userId: "u", email: ADMIN_EMAIL, name: "A", sessionId: "s" },
  ])(
    "refuses a missing or forged admin context (%j) before touching the database",
    async (forged) => {
      await expect(listLeads(forged, query())).rejects.toBeInstanceOf(AdminAccessError);
      await expect(getLead(forged, leakyRow.id)).rejects.toBeInstanceOf(AdminAccessError);
      expect(mocks.findMany).not.toHaveBeenCalled();
      expect(mocks.findUnique).not.toHaveBeenCalled();
    },
  );

  it("refuses a real context once its email leaves ADMIN_EMAILS", async () => {
    const admin = makeAdmin();
    vi.stubEnv("ADMIN_EMAILS", "someone-else@haulix.test");
    await expect(listLeads(admin, query())).rejects.toMatchObject({ denial: "forbidden" });
    await expect(getLead(admin, leakyRow.id)).rejects.toMatchObject({ denial: "forbidden" });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

describe("listLeads: pagination", () => {
  it("applies skip and take from the page and page size", async () => {
    mocks.count.mockResolvedValue(120);
    const result = await listLeads(makeAdmin(), query({ page: "3", pageSize: "25" }));

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 50, take: 25 }));
    expect(result).toMatchObject({
      ok: true,
      data: { page: 3, pageSize: 25, total: 120, totalPages: 5 },
    });
  });

  it("reports one page for no results and an empty list past the last page", async () => {
    mocks.count.mockResolvedValue(0);
    const empty = await listLeads(makeAdmin(), query());
    expect(empty).toMatchObject({ ok: true, data: { leads: [], total: 0, totalPages: 1 } });

    mocks.count.mockResolvedValue(12);
    const past = await listLeads(makeAdmin(), query({ page: "9", pageSize: "10" }));
    expect(past).toMatchObject({ ok: true, data: { leads: [], page: 9, totalPages: 2 } });
  });

  it("only allows the whitelisted page sizes, and never asks the database for more", async () => {
    expect(LEAD_PAGE_SIZES).toEqual([10, 25, 50]);
    for (const pageSize of ["1", "9", "100", "1000", "-5", "abc"]) {
      expect(leadListQuerySchema.safeParse({ pageSize }).success).toBe(false);
    }
    await listLeads(makeAdmin(), query({ pageSize: "50" }));
    expect(mocks.findMany.mock.calls[0]![0].take).toBeLessThanOrEqual(50);
  });
});

describe("listLeads: filters and search", () => {
  it("adds no filter when none is given", () => {
    expect(buildLeadWhere(query())).toEqual({});
  });

  it("filters by type and status together", async () => {
    await listLeads(makeAdmin(), query({ type: "CONTACT", status: "QUALIFIED" }));
    const { where } = mocks.findMany.mock.calls[0]![0];
    expect(where).toEqual({ type: "CONTACT", status: "QUALIFIED" });
    expect(mocks.count).toHaveBeenCalledWith({ where });
  });

  it("searches the contact, company, id-number and subject fields, case-insensitively", () => {
    const where = buildLeadWhere(query({ q: "driver" }));
    expect(where.OR).toHaveLength(LEAD_SEARCH_FIELDS.length);
    for (const field of LEAD_SEARCH_FIELDS) {
      expect(where.OR).toContainEqual({ [field]: { contains: "driver", mode: "insensitive" } });
    }
    // Message bodies, ip hashes and other private columns are never searched.
    const searched = JSON.stringify(where);
    expect(searched).not.toMatch(/ipHash|userAgent|submissionId|message|notes/);
  });

  describe("LIKE wildcards are searched literally", () => {
    it("escapes backslash, percent and underscore", () => {
      expect(escapeLikePattern("plain text")).toBe("plain text");
      expect(escapeLikePattern("50%")).toBe("50\\%");
      expect(escapeLikePattern("a_b")).toBe("a\\_b");
      expect(escapeLikePattern("c:\\dir")).toBe("c:\\\\dir");
      expect(escapeLikePattern("%_\\")).toBe("\\%\\_\\\\");
    });

    it("sends the escaped text to every searched field", () => {
      const where = buildLeadWhere(query({ q: "%" }));
      for (const field of LEAD_SEARCH_FIELDS) {
        expect(where.OR).toContainEqual({ [field]: { contains: "\\%", mode: "insensitive" } });
      }
      expect(buildLeadWhere(query({ q: "a_b" })).OR![0]).toEqual({
        fullName: { contains: "a\\_b", mode: "insensitive" },
      });
    });

    it("leaves ordinary search text untouched", () => {
      expect(buildLeadWhere(query({ q: "o'brien & sons" })).OR![0]).toEqual({
        fullName: { contains: "o'brien & sons", mode: "insensitive" },
      });
    });

    it("escapes the text the list query actually sends to the database", async () => {
      await listLeads(makeAdmin(), query({ q: "100%_" }));
      const { where } = mocks.findMany.mock.calls[0]![0];
      expect(where.OR[0]).toEqual({ fullName: { contains: "100\\%\\_", mode: "insensitive" } });
      expect(mocks.count).toHaveBeenCalledWith({ where });
    });
  });

  it("combines search with filters", () => {
    const where = buildLeadWhere(query({ q: "freight", status: "NEW" }));
    expect(where.status).toBe("NEW");
    expect(where.OR).toBeDefined();
  });

  it("passes search text as a value, never as part of a query structure", () => {
    const hostile = `"}}); DROP TABLE "Lead"; --`;
    const where = buildLeadWhere(query({ q: hostile }));
    expect(where.OR![0]).toEqual({ fullName: { contains: hostile, mode: "insensitive" } });
  });
});

describe("listLeads: sorting", () => {
  it("defaults to newest first", () => {
    expect(buildLeadOrderBy(query())).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  it.each(LEAD_SORT_FIELDS)("sorts by %s with a unique tie-breaker so pages are stable", (sort) => {
    const orderBy = buildLeadOrderBy(query({ sort, dir: "asc" }));
    expect(orderBy[0]).toEqual({ [sort]: "asc" });
    expect(orderBy[orderBy.length - 1]).toEqual({ id: "asc" });
  });

  it("rejects any sort field outside the whitelist", () => {
    for (const sort of ["email", "ipHash", "submissionId", "id", "createdAt; DROP", "__proto__"]) {
      expect(leadListQuerySchema.safeParse({ sort }).success).toBe(false);
    }
    expect(leadListQuerySchema.safeParse({ dir: "sideways" }).success).toBe(false);
  });

  it("falls back to newest first if a bad value ever reaches the builder", () => {
    const bad = { sort: "ipHash", dir: "desc" } as unknown as LeadListQuery;
    expect(buildLeadOrderBy(bad)).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });
});

describe("listLeads: safe fields", () => {
  it("selects explicit columns only, none of them private", async () => {
    await listLeads(makeAdmin(), query());
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

  it("drops anything outside the summary shape even if the database returned it", async () => {
    mocks.findMany.mockResolvedValue([leakyRow]);
    mocks.count.mockResolvedValue(1);
    const result = await listLeads(makeAdmin(), query());

    const text = JSON.stringify(result);
    expect(text).not.toMatch(/leaked|ipHash|userAgent|submissionId/);
    expect(result).toMatchObject({
      ok: true,
      data: { leads: [{ id: leakyRow.id, createdAt: "2026-11-10T10:00:00.000Z" }] },
    });
  });
});

describe("listLeads: failures", () => {
  it("returns not_configured without a database", async () => {
    mocks.configured.value = false;
    await expect(listLeads(makeAdmin(), query())).resolves.toEqual({
      ok: false,
      reason: "not_configured",
    });
  });

  it("returns failed, and logs no personal data, when the database errors", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findMany.mockRejectedValue(
      Object.assign(new Error("Unique violation on jane@example.com"), { code: "P2002" }),
    );
    await expect(listLeads(makeAdmin(), query({ q: "jane@example.com" }))).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0])).not.toContain("jane@example.com");
  });
});

describe("getLead", () => {
  const detailRow = {
    ...leakyRow,
    mcNumber: "123456",
    dotNumber: null,
    preferredLanes: null,
    subject: null,
    message: "Looking for steady loads.",
    sourcePage: "/get-started",
    notifiedAt: new Date("2026-11-10T10:00:05Z"),
    confirmationSentAt: null,
    contactedAt: null,
    leadNotes: [
      {
        id: "note_2",
        body: "Mine",
        authorId: "user_admin",
        author: { id: "user_admin", name: "Admin", email: "leaked@example.com" },
        createdAt: new Date("2026-11-12T10:00:00Z"),
        updatedAt: new Date("2026-11-12T10:00:00Z"),
      },
      {
        id: "note_1",
        body: "Someone else's",
        authorId: "user_other",
        author: { id: "user_other", name: "Other", email: "leaked2@example.com" },
        createdAt: new Date("2026-11-11T10:00:00Z"),
        updatedAt: new Date("2026-11-11T10:00:00Z"),
      },
      {
        id: "note_0",
        body: "Imported",
        authorId: null,
        author: null,
        createdAt: new Date("2026-11-10T11:00:00Z"),
        updatedAt: new Date("2026-11-10T11:00:00Z"),
      },
    ],
    activities: [
      {
        id: "act_1",
        action: "STATUS_CHANGED",
        actor: { id: "user_admin", name: "Admin" },
        fromStatus: "NEW",
        toStatus: "CONTACTED",
        noteId: null,
        metadata: { previousBody: "leaked metadata" },
        createdAt: new Date("2026-11-12T09:00:00Z"),
      },
    ],
  };

  it("returns the lead with notes, activity and who may edit each note", async () => {
    mocks.findUnique.mockResolvedValue(detailRow);
    const result = await getLead(makeAdmin("user_admin"), leakyRow.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      id: leakyRow.id,
      mcNumber: "123456",
      message: "Looking for steady loads.",
      notifiedAt: "2026-11-10T10:00:05.000Z",
      confirmationSentAt: null,
    });
    expect(result.data.notes.map((note) => [note.id, note.canEdit])).toEqual([
      ["note_2", true],
      ["note_1", false],
      ["note_0", false],
    ]);
    expect(result.data.notes[2]!.author).toBeNull();
    expect(result.data.activity[0]).toMatchObject({
      action: "STATUS_CHANGED",
      fromStatus: "NEW",
      toStatus: "CONTACTED",
      createdAt: "2026-11-12T09:00:00.000Z",
    });
  });

  it("never returns private columns, author emails or activity metadata", async () => {
    mocks.findUnique.mockResolvedValue(detailRow);
    const text = JSON.stringify(await getLead(makeAdmin(), leakyRow.id));
    expect(text).not.toMatch(/leaked|ipHash|userAgent|submissionId|metadata/);
  });

  it("selects only safe columns, with capped, newest-first notes and activity", async () => {
    await getLead(makeAdmin(), leakyRow.id);
    const { where, select } = mocks.findUnique.mock.calls[0]![0];
    expect(where).toEqual({ id: leakyRow.id });
    for (const field of ["ipHash", "userAgent", "submissionId", "notes"]) {
      expect(select).not.toHaveProperty(field);
    }
    expect(select.leadNotes.take).toBe(DETAIL_NOTES_LIMIT);
    expect(select.activities.take).toBe(DETAIL_ACTIVITY_LIMIT);
    expect(select.leadNotes.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    expect(select.leadNotes.select.author).toEqual({ select: { id: true, name: true } });
    expect(select.activities.select).not.toHaveProperty("metadata");
  });

  it("returns not_found for an unknown id and not_configured without a database", async () => {
    await expect(getLead(makeAdmin(), leakyRow.id)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    mocks.configured.value = false;
    await expect(getLead(makeAdmin(), leakyRow.id)).resolves.toEqual({
      ok: false,
      reason: "not_configured",
    });
  });

  it("returns failed when the database errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findUnique.mockRejectedValue(new Error("boom"));
    await expect(getLead(makeAdmin(), leakyRow.id)).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
  });
});
