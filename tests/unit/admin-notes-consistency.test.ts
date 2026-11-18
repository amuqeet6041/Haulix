// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { evaluateAdminSession, type AdminContext } from "@/lib/admin-guard";
import { buildLeadTimeline } from "@/lib/lead-timeline";
import { getLead, updateLeadStatus } from "@/services/admin-lead.service";
import { createNote, deleteNote, updateNote } from "@/services/admin-note.service";

/**
 * Regression: the REAL note and lead services against a small in-memory fake of
 * the database. Checks that notes, ownership, legacy notes and the activity
 * trail stay consistent as admins add, edit and delete, and that status changes
 * and notes coexist without disturbing each other.
 */

type Note = {
  id: string;
  leadId: string;
  authorId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

const state = vi.hoisted(() => ({
  lead: null as Record<string, unknown> | null,
  notes: [] as unknown[],
  activities: [] as unknown[],
  users: {} as Record<string, string>,
  clock: 0,
  seq: 1,
}));

const notes = () => state.notes as Note[];
// Real time plus a counter: strictly increasing, and "recent" for the duplicate-submit window.
const tick = () => new Date(Date.now() + ++state.clock);

const withAuthor = (note: Note) => ({
  ...note,
  author: note.authorId
    ? { id: note.authorId, name: state.users[note.authorId], email: "x@leak.test" }
    : null,
});

const fakeDb = {
  lead: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const lead = state.lead;
      if (!lead || lead.id !== where.id) return null;
      return {
        ...lead,
        leadNotes: notes()
          .filter((n) => n.leadId === lead.id)
          .sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())
          .map(withAuthor),
        activities: (state.activities as { createdAt: Date; actorId: string }[])
          .slice()
          .sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())
          .map((a) => ({ ...a, actor: { id: a.actorId, name: state.users[a.actorId] } })),
      };
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string; status: string };
      data: Record<string, unknown>;
    }) => {
      if (!state.lead || state.lead.id !== where.id || state.lead.status !== where.status) {
        throw Object.assign(new Error("not found"), { code: "P2025" });
      }
      Object.assign(state.lead, data, { updatedAt: tick() });
      return state.lead;
    },
  },
  leadNote: {
    findFirst: async ({ where }: { where: Partial<Note> & { createdAt?: { gte: Date } } }) => {
      const match = notes().find(
        (n) =>
          (!where.id || n.id === where.id) &&
          (!where.leadId || n.leadId === where.leadId) &&
          (where.authorId === undefined || n.authorId === where.authorId) &&
          (where.body === undefined || n.body === where.body) &&
          (!where.createdAt || n.createdAt >= where.createdAt.gte),
      );
      return match ? withAuthor(match) : null;
    },
    create: async ({ data }: { data: { leadId: string; authorId: string; body: string } }) => {
      const created = tick();
      const note: Note = {
        id: `note_${state.seq++}`,
        ...data,
        createdAt: created,
        updatedAt: created,
      };
      state.notes.push(note);
      return withAuthor(note);
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string; authorId: string; updatedAt: Date };
      data: { body: string };
    }) => {
      const note = notes().find(
        (n) =>
          n.id === where.id &&
          n.authorId === where.authorId &&
          n.updatedAt.valueOf() === where.updatedAt.valueOf(),
      );
      if (!note) throw Object.assign(new Error("not found"), { code: "P2025" });
      note.body = data.body;
      note.updatedAt = tick();
      return withAuthor(note);
    },
    deleteMany: async ({ where }: { where: { id: string; leadId: string; authorId: string } }) => {
      const before = notes().length;
      state.notes = notes().filter(
        (n) => !(n.id === where.id && n.leadId === where.leadId && n.authorId === where.authorId),
      );
      return { count: before - notes().length };
    },
  },
  leadActivity: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      state.activities.push({
        id: `act_${state.seq++}`,
        createdAt: tick(),
        noteId: null,
        metadata: null,
        ...data,
      });
    },
  },
  $transaction: async (work: (tx: unknown) => unknown) => work(fakeDb),
};

vi.mock("@/lib/prisma", () => ({ isDatabaseConfigured: () => true, getPrisma: () => fakeDb }));

const LEAD = "cmi4x2k7p0000abcd1234efgh";
const OTHER_LEAD = "cmi4x2k7p0000zzzz9999zzzz";
const ALICE = "user_alice";
const BOB = "user_bob";

function admin(id: string, email: string): AdminContext {
  const result = evaluateAdminSession({
    session: { id: `s_${id}`, userId: id, expiresAt: new Date(Date.now() + 60_000) },
    user: { id, email, name: state.users[id]!, role: "admin" },
  });
  if (!result.ok) throw new Error("not authorized");
  return result.admin;
}
const alice = () => admin(ALICE, "alice@haulix.test");
const bob = () => admin(BOB, "bob@haulix.test");

async function detail(as = alice()) {
  const result = await getLead(as, LEAD);
  if (!result.ok) throw new Error("detail failed");
  return result.data;
}

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", "alice@haulix.test,bob@haulix.test");
  state.users = { [ALICE]: "Alice Admin", [BOB]: "Bob Admin" };
  state.clock = 0;
  state.seq = 1;
  const created = new Date("2026-11-10T09:00:00Z");
  state.lead = {
    id: LEAD,
    type: "CARRIER_INQUIRY",
    status: "NEW",
    fullName: "Jane Driver",
    email: "jane@example.com",
    phone: null,
    companyName: null,
    equipment: null,
    fleetSize: null,
    inquiryType: null,
    createdAt: created,
    updatedAt: created,
    mcNumber: null,
    dotNumber: null,
    preferredLanes: null,
    subject: null,
    message: null,
    sourcePage: null,
    notifiedAt: null,
    confirmationSentAt: null,
    contactedAt: null,
    ipHash: "leaked-ip-hash",
    submissionId: "leaked-submission",
  };
  // A legacy note imported from the old notes column: no author.
  state.notes = [
    {
      id: "note_legacy",
      leadId: LEAD,
      authorId: null,
      body: "Imported legacy note",
      createdAt: new Date("2026-11-11T08:00:00Z"),
      updatedAt: new Date("2026-11-11T08:00:00Z"),
    },
  ];
  state.activities = [];
});

afterEach(() => vi.unstubAllEnvs());

describe("notes and their activity trail", () => {
  it("adding a note shows it first, owned by the author, and logs NOTE_ADDED without its text", async () => {
    const result = await createNote(alice(), LEAD, { body: "Called, left a voicemail." });
    expect(result).toMatchObject({ ok: true, data: { changed: true } });

    const lead = await detail();
    expect(lead.notes.map((n) => n.body)).toEqual([
      "Called, left a voicemail.",
      "Imported legacy note",
    ]);
    expect(lead.notes[0]).toMatchObject({
      author: { id: ALICE, name: "Alice Admin" },
      canEdit: true,
    });
    expect(lead.activity).toHaveLength(1);
    expect(lead.activity[0]).toMatchObject({
      action: "NOTE_ADDED",
      actor: { name: "Alice Admin" },
    });
    expect(JSON.stringify(lead.activity)).not.toContain("voicemail");
  });

  it("editing keeps the author and creation time, adds an edited indicator and logs NOTE_EDITED", async () => {
    const added = await createNote(alice(), LEAD, { body: "First draft" });
    if (!added.ok) throw new Error("add failed");
    const original = added.data.note;

    const edited = await updateNote(alice(), LEAD, original.id, {
      body: "Second draft",
      expectedUpdatedAt: original.updatedAt,
    });
    expect(edited).toMatchObject({ ok: true, data: { changed: true } });

    const note = (await detail()).notes.find((n) => n.id === original.id)!;
    expect(note.body).toBe("Second draft");
    expect(note.author?.id).toBe(ALICE);
    expect(note.createdAt).toBe(original.createdAt);
    expect(note.updatedAt).not.toBe(note.createdAt);
    expect((await detail()).activity.map((a) => a.action)).toEqual(["NOTE_EDITED", "NOTE_ADDED"]);
    // The previous text is only an audit record, never part of what the UI reads.
    expect(JSON.stringify((await detail()).activity)).not.toContain("First draft");
  });

  it("deleting removes the note, logs NOTE_DELETED, and never exposes the deleted text", async () => {
    const added = await createNote(alice(), LEAD, { body: "Delete me" });
    if (!added.ok) throw new Error("add failed");
    expect(await deleteNote(alice(), LEAD, added.data.note.id)).toEqual({
      ok: true,
      data: { noteId: added.data.note.id },
    });

    const lead = await detail();
    expect(lead.notes.map((n) => n.id)).toEqual(["note_legacy"]);
    expect(lead.activity.map((a) => a.action)).toEqual(["NOTE_DELETED", "NOTE_ADDED"]);
    expect(JSON.stringify(lead)).not.toContain("Delete me");
    // The audit record exists in the database for investigation.
    const entry = (state.activities as { action: string; metadata: unknown }[]).find(
      (a) => a.action === "NOTE_DELETED",
    );
    expect(entry?.metadata).toEqual({ previousBody: "Delete me" });
  });

  it("a repeated submission adds one note and one activity entry", async () => {
    await createNote(alice(), LEAD, { body: "Same text" });
    const again = await createNote(alice(), LEAD, { body: "Same text" });
    expect(again).toMatchObject({ ok: true, data: { changed: false } });
    expect(notes().filter((n) => n.body === "Same text")).toHaveLength(1);
    expect(state.activities).toHaveLength(1);
  });
});

describe("ownership and legacy notes", () => {
  it("another admin cannot edit or delete a note, and nothing changes or is logged", async () => {
    const added = await createNote(alice(), LEAD, { body: "Alice's note" });
    if (!added.ok) throw new Error("add failed");
    const id = added.data.note.id;
    const before = JSON.stringify(state.notes);
    const logged = state.activities.length;

    expect(await updateNote(bob(), LEAD, id, { body: "Bob was here" })).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(await deleteNote(bob(), LEAD, id)).toEqual({ ok: false, reason: "forbidden" });
    expect(JSON.stringify(state.notes)).toBe(before);
    expect(state.activities).toHaveLength(logged);

    // And Bob sees it as read-only.
    expect((await detail(bob())).notes.find((n) => n.id === id)?.canEdit).toBe(false);
    expect((await detail(alice())).notes.find((n) => n.id === id)?.canEdit).toBe(true);
  });

  it("nobody can edit, delete or reassign a legacy note; it stays exactly as imported", async () => {
    const before = JSON.stringify(notes().find((n) => n.id === "note_legacy"));
    for (const who of [alice(), bob()]) {
      expect(await updateNote(who, LEAD, "note_legacy", { body: "Rewritten" })).toEqual({
        ok: false,
        reason: "forbidden",
      });
      expect(await deleteNote(who, LEAD, "note_legacy")).toEqual({
        ok: false,
        reason: "forbidden",
      });
    }
    expect(JSON.stringify(notes().find((n) => n.id === "note_legacy"))).toBe(before);

    const legacy = (await detail()).notes.find((n) => n.id === "note_legacy")!;
    expect(legacy).toMatchObject({ body: "Imported legacy note", author: null, canEdit: false });
  });

  it("a note id cannot be used through a different lead (no cross-lead access)", async () => {
    const added = await createNote(alice(), LEAD, { body: "Mine" });
    if (!added.ok) throw new Error("add failed");
    const id = added.data.note.id;
    expect(await updateNote(alice(), OTHER_LEAD, id, { body: "x" })).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await deleteNote(alice(), OTHER_LEAD, id)).toEqual({ ok: false, reason: "not_found" });
    expect(notes().some((n) => n.id === id)).toBe(true);
  });

  it("two admins editing at once: the second, stale edit is refused instead of overwriting", async () => {
    const added = await createNote(alice(), LEAD, { body: "v1" });
    if (!added.ok) throw new Error("add failed");
    const seen = added.data.note;

    const first = await updateNote(alice(), LEAD, seen.id, {
      body: "v2",
      expectedUpdatedAt: seen.updatedAt,
    });
    expect(first).toMatchObject({ ok: true });
    const stale = await updateNote(alice(), LEAD, seen.id, {
      body: "v3",
      expectedUpdatedAt: seen.updatedAt,
    });
    expect(stale).toEqual({ ok: false, reason: "conflict" });
    expect(notes().find((n) => n.id === seen.id)?.body).toBe("v2");
  });
});

describe("notes and status changes together", () => {
  it("builds one consistent timeline and leaves notes untouched by status changes", async () => {
    await createNote(alice(), LEAD, { body: "Spoke with the owner." });
    await updateLeadStatus(alice(), LEAD, { status: "CONTACTED", expectedStatus: "NEW" });
    await createNote(bob(), LEAD, { body: "Sent the packet." });
    await updateLeadStatus(bob(), LEAD, { status: "QUALIFIED" });

    const lead = await detail();
    expect(lead.status).toBe("QUALIFIED");
    expect(lead.notes.map((n) => n.body)).toEqual([
      "Sent the packet.",
      "Spoke with the owner.",
      "Imported legacy note",
    ]);
    expect(lead.activity.map((a) => a.action)).toEqual([
      "STATUS_CHANGED",
      "NOTE_ADDED",
      "STATUS_CHANGED",
      "NOTE_ADDED",
    ]);
    const titles = buildLeadTimeline(lead).map((item) => item.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Status changed from Contacted to Qualified",
        "Status changed from New to Contacted",
        "Note added",
      ]),
    );
    // No duplicate activity entries: exactly one per action.
    expect(state.activities).toHaveLength(4);
  });

  it("never leaks private columns or author emails", async () => {
    await createNote(alice(), LEAD, { body: "x" });
    expect(JSON.stringify(await detail())).not.toMatch(/leaked|ipHash|submissionId|leak\.test/);
  });
});
