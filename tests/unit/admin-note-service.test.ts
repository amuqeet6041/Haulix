// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAccessError, evaluateAdminSession, type AdminContext } from "@/lib/admin-guard";
import {
  createNote,
  deleteNote,
  DUPLICATE_NOTE_WINDOW_MS,
  updateNote,
} from "@/services/admin-note.service";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  leadFindUnique: vi.fn(),
  noteFindFirst: vi.fn(),
  noteCreate: vi.fn(),
  noteUpdate: vi.fn(),
  noteDeleteMany: vi.fn(),
  activityCreate: vi.fn(),
  leadWrite: vi.fn(),
  topLevel: vi.fn(),
  configured: { value: true },
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => mocks.configured.value,
  getPrisma: () => ({
    $transaction: mocks.transaction,
    leadNote: new Proxy({}, { get: () => mocks.topLevel }),
  }),
}));

const ADMIN_EMAIL = "admin@haulix.test";
const USER_ID = "user_admin_1";
const OTHER_ID = "user_admin_2";
const LEAD = "cmi4x2k7p0000abcd1234efgh";
const OTHER_LEAD = "cmi4x2k7p0000zzzz9999zzzz";
const NOTE = "cmi4x2k7p0001abcd1234efgh";

function makeAdmin(): AdminContext {
  const result = evaluateAdminSession({
    session: { id: "s", userId: USER_ID, expiresAt: new Date(Date.now() + 60_000) },
    user: { id: USER_ID, email: ADMIN_EMAIL, name: "Admin", role: "admin" },
  });
  if (!result.ok) throw new Error("test admin was not authorized");
  return result.admin;
}

const T0 = new Date("2026-11-12T10:00:00.000Z");
const noteRow = (overrides: Record<string, unknown> = {}) => ({
  id: NOTE,
  body: "Original text",
  authorId: USER_ID,
  author: { id: USER_ID, name: "Admin", email: "leaked@example.com" },
  createdAt: T0,
  updatedAt: T0,
  ...overrides,
});

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", ADMIN_EMAIL);
  mocks.configured.value = true;
  mocks.transaction.mockImplementation(async (work: (tx: unknown) => unknown) =>
    work({
      lead: { findUnique: mocks.leadFindUnique, update: mocks.leadWrite, delete: mocks.leadWrite },
      leadNote: {
        findFirst: mocks.noteFindFirst,
        create: mocks.noteCreate,
        update: mocks.noteUpdate,
        deleteMany: mocks.noteDeleteMany,
      },
      leadActivity: { create: mocks.activityCreate },
    }),
  );
  mocks.leadFindUnique.mockResolvedValue({ id: LEAD });
  mocks.noteFindFirst.mockResolvedValue(null);
  mocks.noteCreate.mockImplementation(async ({ data }: { data: { body: string } }) =>
    noteRow({ body: data.body }),
  );
  mocks.noteUpdate.mockImplementation(async ({ data }: { data: { body: string } }) =>
    noteRow({ body: data.body, updatedAt: new Date("2026-11-13T10:00:00.000Z") }),
  );
  mocks.noteDeleteMany.mockResolvedValue({ count: 1 });
  mocks.activityCreate.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const mock of Object.values(mocks)) {
    if (typeof mock === "function" && "mockReset" in mock) mock.mockReset();
  }
});

describe("authorization (every operation)", () => {
  const calls = {
    create: (admin: unknown) => createNote(admin, LEAD, { body: "x" }),
    update: (admin: unknown) => updateNote(admin, LEAD, NOTE, { body: "x" }),
    delete: (admin: unknown) => deleteNote(admin, LEAD, NOTE),
  };

  describe.each(Object.entries(calls))("%s", (_name, run) => {
    it.each([
      undefined,
      null,
      {},
      { userId: USER_ID, email: ADMIN_EMAIL, name: "A", sessionId: "s" },
    ])(
      "refuses a missing or forged admin context (%j) before touching the database",
      async (forged) => {
        await expect(run(forged)).rejects.toBeInstanceOf(AdminAccessError);
        expect(mocks.transaction).not.toHaveBeenCalled();
      },
    );

    it("refuses an admin removed from ADMIN_EMAILS", async () => {
      const admin = makeAdmin();
      vi.stubEnv("ADMIN_EMAILS", "someone-else@haulix.test");
      await expect(run(admin)).rejects.toMatchObject({ denial: "forbidden" });
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("returns not_configured without a database", async () => {
      mocks.configured.value = false;
      await expect(run(makeAdmin())).resolves.toEqual({ ok: false, reason: "not_configured" });
    });

    it("returns failed, logging no personal data, when the database errors", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.transaction.mockRejectedValue(new Error("boom for jane@example.com postgres://secret"));
      await expect(run(makeAdmin())).resolves.toEqual({ ok: false, reason: "failed" });
      expect(String(error.mock.calls[0])).not.toMatch(/jane@example\.com|postgres/);
    });
  });
});

describe("createNote", () => {
  it("adds the note as the signed-in admin and records NOTE_ADDED without the note's text", async () => {
    const result = await createNote(makeAdmin(), LEAD, { body: "Called, left a voicemail." });

    expect(result).toMatchObject({
      ok: true,
      data: { changed: true, note: { body: "Called, left a voicemail.", canEdit: true } },
    });
    expect(mocks.noteCreate.mock.calls[0]![0].data).toEqual({
      leadId: LEAD,
      authorId: USER_ID,
      body: "Called, left a voicemail.",
    });
    const activity = mocks.activityCreate.mock.calls[0]![0].data;
    expect(activity).toEqual({
      leadId: LEAD,
      actorId: USER_ID,
      action: "NOTE_ADDED",
      noteId: NOTE,
    });
    expect(JSON.stringify(activity)).not.toContain("voicemail");
  });

  it("answers not_found for an unknown lead and writes nothing", async () => {
    mocks.leadFindUnique.mockResolvedValue(null);
    await expect(createNote(makeAdmin(), LEAD, { body: "x" })).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(mocks.noteCreate).not.toHaveBeenCalled();
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("does not add the same note twice within a few seconds (a double submit)", async () => {
    mocks.noteFindFirst.mockResolvedValue(noteRow({ body: "Same text" }));
    const result = await createNote(makeAdmin(), LEAD, { body: "Same text" });

    expect(result).toMatchObject({ ok: true, data: { changed: false, note: { id: NOTE } } });
    expect(mocks.noteCreate).not.toHaveBeenCalled();
    expect(mocks.activityCreate).not.toHaveBeenCalled();

    const where = mocks.noteFindFirst.mock.calls[0]![0].where;
    expect(where).toMatchObject({ leadId: LEAD, authorId: USER_ID, body: "Same text" });
    const age = Date.now() - where.createdAt.gte.getTime();
    expect(age).toBeGreaterThanOrEqual(DUPLICATE_NOTE_WINDOW_MS - 1000);
    expect(age).toBeLessThanOrEqual(DUPLICATE_NOTE_WINDOW_MS + 1000);
  });

  it("only treats the admin's own recent notes as duplicates", async () => {
    await createNote(makeAdmin(), LEAD, { body: "x" });
    expect(mocks.noteFindFirst.mock.calls[0]![0].where.authorId).toBe(USER_ID);
  });

  it("does everything in one transaction", async () => {
    await createNote(makeAdmin(), LEAD, { body: "x" });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.topLevel).not.toHaveBeenCalled();
  });

  it("returns only safe columns and never an author email", async () => {
    const result = await createNote(makeAdmin(), LEAD, { body: "x" });
    expect(JSON.stringify(result)).not.toMatch(/leaked|email/);
    expect(Object.keys(mocks.noteCreate.mock.calls[0]![0].select).sort()).toEqual([
      "author",
      "authorId",
      "body",
      "createdAt",
      "id",
      "updatedAt",
    ]);
  });
});

describe("updateNote", () => {
  beforeEach(() => mocks.noteFindFirst.mockResolvedValue(noteRow()));

  it("edits the admin's own note, keeping the author, and records NOTE_EDITED with the previous text", async () => {
    const result = await updateNote(makeAdmin(), LEAD, NOTE, { body: "Edited text" });

    expect(result).toMatchObject({
      ok: true,
      data: { changed: true, note: { id: NOTE, body: "Edited text", author: { id: USER_ID } } },
    });
    const update = mocks.noteUpdate.mock.calls[0]![0];
    // Only the body is written: the author and created time are never touched.
    expect(update.data).toEqual({ body: "Edited text" });
    // The write itself is limited to the author's own note, at the version that was read.
    expect(update.where).toEqual({ id: NOTE, authorId: USER_ID, updatedAt: T0 });
    expect(mocks.activityCreate.mock.calls[0]![0].data).toEqual({
      leadId: LEAD,
      actorId: USER_ID,
      action: "NOTE_EDITED",
      noteId: NOTE,
      metadata: { previousBody: "Original text" },
    });
  });

  it("looks the note up by its own id AND the lead id, so another lead's note is not found", async () => {
    mocks.noteFindFirst.mockResolvedValue(null);
    await expect(updateNote(makeAdmin(), OTHER_LEAD, NOTE, { body: "x" })).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(mocks.noteFindFirst.mock.calls[0]![0].where).toEqual({ id: NOTE, leadId: OTHER_LEAD });
    expect(mocks.noteUpdate).not.toHaveBeenCalled();
  });

  it("refuses to edit another admin's note and writes nothing", async () => {
    mocks.noteFindFirst.mockResolvedValue(noteRow({ authorId: OTHER_ID }));
    await expect(updateNote(makeAdmin(), LEAD, NOTE, { body: "Hijacked" })).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(mocks.noteUpdate).not.toHaveBeenCalled();
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("refuses to edit a legacy note that has no author", async () => {
    mocks.noteFindFirst.mockResolvedValue(noteRow({ authorId: null, author: null }));
    await expect(updateNote(makeAdmin(), LEAD, NOTE, { body: "Rewritten" })).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(mocks.noteUpdate).not.toHaveBeenCalled();
  });

  it("reports a conflict when the note changed since it was loaded", async () => {
    const result = await updateNote(makeAdmin(), LEAD, NOTE, {
      body: "Mine",
      expectedUpdatedAt: "2026-11-11T10:00:00.000Z",
    });
    expect(result).toEqual({ ok: false, reason: "conflict" });
    expect(mocks.noteUpdate).not.toHaveBeenCalled();
  });

  it("accepts the edit when the version the admin saw is still current", async () => {
    const result = await updateNote(makeAdmin(), LEAD, NOTE, {
      body: "Mine",
      expectedUpdatedAt: T0.toISOString(),
    });
    expect(result).toMatchObject({ ok: true, data: { changed: true } });
  });

  it("reports a conflict when another edit lands between the read and the write", async () => {
    mocks.noteUpdate.mockRejectedValue(Object.assign(new Error("not found"), { code: "P2025" }));
    await expect(updateNote(makeAdmin(), LEAD, NOTE, { body: "Mine" })).resolves.toEqual({
      ok: false,
      reason: "conflict",
    });
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("changes nothing and logs nothing when the text is identical", async () => {
    const result = await updateNote(makeAdmin(), LEAD, NOTE, { body: "Original text" });
    expect(result).toMatchObject({ ok: true, data: { changed: false } });
    expect(mocks.noteUpdate).not.toHaveBeenCalled();
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });
});

describe("deleteNote", () => {
  beforeEach(() =>
    mocks.noteFindFirst.mockResolvedValue({ id: NOTE, body: "Secret text", authorId: USER_ID }),
  );

  it("deletes exactly the admin's own note and records NOTE_DELETED", async () => {
    const result = await deleteNote(makeAdmin(), LEAD, NOTE);

    expect(result).toEqual({ ok: true, data: { noteId: NOTE } });
    expect(mocks.noteDeleteMany.mock.calls[0]![0].where).toEqual({
      id: NOTE,
      leadId: LEAD,
      authorId: USER_ID,
    });
    expect(mocks.activityCreate.mock.calls[0]![0].data).toMatchObject({
      leadId: LEAD,
      actorId: USER_ID,
      action: "NOTE_DELETED",
      noteId: NOTE,
    });
  });

  it("keeps the deleted text only as an audit record, never in a field the UI reads", async () => {
    await deleteNote(makeAdmin(), LEAD, NOTE);
    const data = mocks.activityCreate.mock.calls[0]![0].data;
    expect(data.metadata).toEqual({ previousBody: "Secret text" });
    expect(Object.keys(data)).not.toContain("body");
  });

  it("refuses to delete another admin's note and removes nothing", async () => {
    mocks.noteFindFirst.mockResolvedValue({ id: NOTE, body: "x", authorId: OTHER_ID });
    await expect(deleteNote(makeAdmin(), LEAD, NOTE)).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(mocks.noteDeleteMany).not.toHaveBeenCalled();
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("refuses to delete a legacy note that has no author", async () => {
    mocks.noteFindFirst.mockResolvedValue({ id: NOTE, body: "Imported", authorId: null });
    await expect(deleteNote(makeAdmin(), LEAD, NOTE)).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(mocks.noteDeleteMany).not.toHaveBeenCalled();
  });

  it("answers not_found for a note on a different lead, or a missing note", async () => {
    mocks.noteFindFirst.mockResolvedValue(null);
    await expect(deleteNote(makeAdmin(), OTHER_LEAD, NOTE)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(mocks.noteFindFirst.mock.calls[0]![0].where).toEqual({ id: NOTE, leadId: OTHER_LEAD });
    expect(mocks.noteDeleteMany).not.toHaveBeenCalled();
  });

  it("reports a conflict, and logs nothing, if the note vanished before the delete", async () => {
    mocks.noteDeleteMany.mockResolvedValue({ count: 0 });
    await expect(deleteNote(makeAdmin(), LEAD, NOTE)).resolves.toEqual({
      ok: false,
      reason: "conflict",
    });
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("never deletes leads or runs outside the transaction", async () => {
    await deleteNote(makeAdmin(), LEAD, NOTE);
    expect(mocks.leadWrite).not.toHaveBeenCalled();
    expect(mocks.topLevel).not.toHaveBeenCalled();
  });
});
