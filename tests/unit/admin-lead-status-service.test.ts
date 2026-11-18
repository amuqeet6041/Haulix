// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { leadStatusValues } from "@/content/lead-status";
import { AdminAccessError, evaluateAdminSession, type AdminContext } from "@/lib/admin-guard";
import { updateLeadStatus } from "@/services/admin-lead.service";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  activityCreate: vi.fn(),
  // Anything below must never be touched by a status update.
  updateMany: vi.fn(),
  leadDelete: vi.fn(),
  noteWrite: vi.fn(),
  topLevelLead: vi.fn(),
  configured: { value: true },
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => mocks.configured.value,
  getPrisma: () => ({
    $transaction: mocks.transaction,
    // Used outside the transaction? That would be a bug: the update must be atomic.
    lead: new Proxy({}, { get: () => mocks.topLevelLead }),
    leadActivity: new Proxy({}, { get: () => mocks.topLevelLead }),
  }),
}));

const ADMIN_EMAIL = "admin@haulix.test";
const ID = "cmi4x2k7p0000abcd1234efgh";
const USER_ID = "user_admin_1";

function makeAdmin(): AdminContext {
  const result = evaluateAdminSession({
    session: { id: "s", userId: USER_ID, expiresAt: new Date(Date.now() + 60_000) },
    user: { id: USER_ID, email: ADMIN_EMAIL, name: "Admin", role: "admin" },
  });
  if (!result.ok) throw new Error("test admin was not authorized");
  return result.admin;
}

const NOW = new Date("2026-11-18T12:00:00Z");
const row = (status: string, contactedAt: Date | null = null) => ({
  id: ID,
  status,
  updatedAt: new Date("2026-11-10T00:00:00Z"),
  contactedAt,
});

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", ADMIN_EMAIL);
  mocks.configured.value = true;
  mocks.transaction.mockImplementation(async (work: (tx: unknown) => unknown) =>
    work({
      lead: {
        findUnique: mocks.findUnique,
        update: mocks.update,
        updateMany: mocks.updateMany,
        delete: mocks.leadDelete,
      },
      leadActivity: { create: mocks.activityCreate },
      leadNote: { create: mocks.noteWrite, update: mocks.noteWrite, delete: mocks.noteWrite },
    }),
  );
  mocks.update.mockImplementation(async ({ data }: { data: { status: string } }) => ({
    ...row(data.status),
    updatedAt: NOW,
  }));
  mocks.activityCreate.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const mock of Object.values(mocks)) {
    if (typeof mock === "function" && "mockReset" in mock) mock.mockReset();
  }
});

describe("updateLeadStatus: authorization", () => {
  it.each([
    undefined,
    null,
    {},
    { userId: USER_ID, email: ADMIN_EMAIL, name: "A", sessionId: "s" },
  ])(
    "refuses a missing or forged admin context (%j) before touching the database",
    async (forged) => {
      await expect(updateLeadStatus(forged, ID, { status: "SPAM" })).rejects.toBeInstanceOf(
        AdminAccessError,
      );
      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );

  it("refuses an admin removed from ADMIN_EMAILS", async () => {
    const admin = makeAdmin();
    vi.stubEnv("ADMIN_EMAILS", "someone-else@haulix.test");
    await expect(updateLeadStatus(admin, ID, { status: "SPAM" })).rejects.toMatchObject({
      denial: "forbidden",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns not_configured without a database", async () => {
    mocks.configured.value = false;
    await expect(updateLeadStatus(makeAdmin(), ID, { status: "SPAM" })).resolves.toEqual({
      ok: false,
      reason: "not_configured",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

describe("updateLeadStatus: every status-to-status transition", () => {
  const pairs = leadStatusValues.flatMap((from) =>
    leadStatusValues.map((to) => [from, to] as const),
  );
  const changes = pairs.filter(([from, to]) => from !== to);
  const repeats = pairs.filter(([from, to]) => from === to);

  it("covers all 36 combinations of the six statuses (30 changes, 6 repeats)", () => {
    expect(pairs).toHaveLength(36);
    expect(changes).toHaveLength(30);
    expect(repeats).toHaveLength(6);
  });

  it.each(changes)("%s to %s: updates the lead and records who changed what", async (from, to) => {
    mocks.findUnique.mockResolvedValue(row(from));
    const result = await updateLeadStatus(makeAdmin(), ID, { status: to, expectedStatus: from });

    expect(result).toMatchObject({
      ok: true,
      data: { changed: true, lead: { id: ID, status: to } },
    });

    // The update is guarded by the status that was read (compare-and-set).
    expect(mocks.update).toHaveBeenCalledTimes(1);
    const args = mocks.update.mock.calls[0]![0];
    expect(args.where).toEqual({ id: ID, status: from });
    expect(args.data.status).toBe(to);

    // And exactly one audit entry: previous status, new status, actor, lead.
    expect(mocks.activityCreate).toHaveBeenCalledTimes(1);
    expect(mocks.activityCreate.mock.calls[0]![0].data).toEqual({
      leadId: ID,
      actorId: USER_ID,
      action: "STATUS_CHANGED",
      fromStatus: from,
      toStatus: to,
    });
  });

  it.each(repeats)("%s to %s: changes nothing and logs nothing", async (status) => {
    mocks.findUnique.mockResolvedValue(row(status));
    const result = await updateLeadStatus(makeAdmin(), ID, { status, expectedStatus: status });

    expect(result).toMatchObject({ ok: true, data: { changed: false, lead: { status } } });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("accepts a request without expectedStatus (it is optional)", async () => {
    mocks.findUnique.mockResolvedValue(row("NEW"));
    const result = await updateLeadStatus(makeAdmin(), ID, { status: "QUALIFIED" });
    expect(result).toMatchObject({ ok: true, data: { changed: true } });
  });
});

describe("updateLeadStatus: contactedAt", () => {
  const first = new Date("2026-11-12T08:00:00Z");

  it("is set the first time a lead becomes Contacted", async () => {
    mocks.findUnique.mockResolvedValue(row("NEW", null));
    await updateLeadStatus(makeAdmin(), ID, { status: "CONTACTED" });
    expect(mocks.update.mock.calls[0]![0].data.contactedAt).toBeInstanceOf(Date);
  });

  it("is never changed again once set", async () => {
    mocks.findUnique.mockResolvedValue(row("QUALIFIED", first));
    await updateLeadStatus(makeAdmin(), ID, { status: "CONTACTED" });
    expect(mocks.update.mock.calls[0]![0].data).toEqual({ status: "CONTACTED" });
  });

  it.each(["NEW", "QUALIFIED", "ONBOARDED", "REJECTED", "SPAM"] as const)(
    "is not set by a move to %s",
    async (to) => {
      mocks.findUnique.mockResolvedValue(row("CONTACTED", null));
      await updateLeadStatus(makeAdmin(), ID, { status: to });
      expect(mocks.update.mock.calls[0]![0].data).toEqual({ status: to });
    },
  );

  it("is not cleared when moving away from Contacted", async () => {
    mocks.findUnique.mockResolvedValue(row("CONTACTED", first));
    await updateLeadStatus(makeAdmin(), ID, { status: "NEW" });
    expect(mocks.update.mock.calls[0]![0].data).not.toHaveProperty("contactedAt");
  });
});

describe("updateLeadStatus: conflicts, missing leads and failures", () => {
  it("reports not_found for an unknown lead and writes nothing", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(updateLeadStatus(makeAdmin(), ID, { status: "SPAM" })).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("reports a conflict when the lead changed since the admin loaded it, writing nothing", async () => {
    mocks.findUnique.mockResolvedValue(row("CONTACTED"));
    await expect(
      updateLeadStatus(makeAdmin(), ID, { status: "SPAM", expectedStatus: "NEW" }),
    ).resolves.toEqual({ ok: false, reason: "conflict" });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("reports a conflict when someone else wins the race between the read and the update", async () => {
    mocks.findUnique.mockResolvedValue(row("NEW"));
    mocks.update.mockRejectedValue(
      Object.assign(new Error("Record to update not found."), { code: "P2025" }),
    );
    await expect(updateLeadStatus(makeAdmin(), ID, { status: "SPAM" })).resolves.toEqual({
      ok: false,
      reason: "conflict",
    });
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("returns failed, and logs no personal data, when the database errors", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findUnique.mockResolvedValue(row("NEW"));
    mocks.update.mockRejectedValue(new Error("deadlock for jane@example.com at postgres://secret"));
    await expect(updateLeadStatus(makeAdmin(), ID, { status: "SPAM" })).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
    expect(String(error.mock.calls[0])).not.toMatch(/jane@example\.com|postgres/);
  });

  it("returns failed when writing the activity fails (so the transaction rolls back)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findUnique.mockResolvedValue(row("NEW"));
    mocks.activityCreate.mockRejectedValue(new Error("audit write failed"));
    await expect(updateLeadStatus(makeAdmin(), ID, { status: "SPAM" })).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
  });
});

describe("updateLeadStatus: atomicity, notes and private data", () => {
  it("does everything inside one transaction and nothing outside it", async () => {
    mocks.findUnique.mockResolvedValue(row("NEW"));
    await updateLeadStatus(makeAdmin(), ID, { status: "QUALIFIED" });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.topLevelLead).not.toHaveBeenCalled();
  });

  it("never touches notes, deletes, or bulk updates", async () => {
    mocks.findUnique.mockResolvedValue(row("NEW"));
    await updateLeadStatus(makeAdmin(), ID, { status: "SPAM" });
    expect(mocks.noteWrite).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.leadDelete).not.toHaveBeenCalled();
  });

  it("reads and returns only safe columns", async () => {
    mocks.findUnique.mockResolvedValue({
      ...row("NEW"),
      ipHash: "leaked-ip",
      userAgent: "leaked-agent",
      submissionId: "leaked-submission",
    });
    mocks.update.mockResolvedValue({
      ...row("SPAM"),
      ipHash: "leaked-ip",
      email: "leaked@example.com",
      submissionId: "leaked-submission",
    });
    const result = await updateLeadStatus(makeAdmin(), ID, { status: "SPAM" });

    expect(Object.keys(mocks.findUnique.mock.calls[0]![0].select).sort()).toEqual([
      "contactedAt",
      "id",
      "status",
      "updatedAt",
    ]);
    expect(Object.keys(mocks.update.mock.calls[0]![0].select).sort()).toEqual([
      "contactedAt",
      "id",
      "status",
      "updatedAt",
    ]);
    expect(JSON.stringify(result)).not.toMatch(/leaked|ipHash|userAgent|submissionId|email/);
    expect(result).toMatchObject({
      ok: true,
      data: {
        lead: { id: ID, status: "SPAM", updatedAt: "2026-11-10T00:00:00.000Z", contactedAt: null },
      },
    });
  });
});
