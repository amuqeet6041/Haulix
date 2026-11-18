// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "@/app/api/admin/leads/[id]/notes/[noteId]/route";
import { POST } from "@/app/api/admin/leads/[id]/notes/route";
import { NOTE_BODY_MAX } from "@/validations/admin-leads";

import { adminRequest, createTestAuth, stubAuthEnv, type TestAuth } from "../helpers/admin-auth";

/**
 * The note routes behind real Better Auth sessions (in-memory adapter) with
 * two real admin accounts, so ownership is tested against real user ids.
 * Only the lead database and cache revalidation are mocked.
 */

const holder = vi.hoisted(() => ({ auth: null as unknown, configured: true }));
const mocks = vi.hoisted(() => ({
  leadFindUnique: vi.fn(),
  noteFindFirst: vi.fn(),
  noteCreate: vi.fn(),
  noteUpdate: vi.fn(),
  noteDeleteMany: vi.fn(),
  activityCreate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAuth: () => (holder.auth as { auth: unknown }).auth,
  isAuthConfigured: () => true,
}));
vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => holder.configured,
  getPrisma: () => ({
    $transaction: async (work: (tx: unknown) => unknown) =>
      work({
        lead: { findUnique: mocks.leadFindUnique },
        leadNote: {
          findFirst: mocks.noteFindFirst,
          create: mocks.noteCreate,
          update: mocks.noteUpdate,
          deleteMany: mocks.noteDeleteMany,
        },
        leadActivity: { create: mocks.activityCreate },
      }),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const ALICE = "alice@haulix.test";
const BOB = "bob@haulix.test";
const LEAD = "cmi4x2k7p0000abcd1234efgh";
const NOTE = "cmi4x2k7p0001abcd1234efgh";
const T0 = new Date("2026-11-12T10:00:00.000Z");

let testAuth: TestAuth;

type Ctx = { id: string; noteId?: string };
type Route = (request: Request, context: never) => Promise<Response>;
const run = (handler: unknown, request: Request, params: Ctx = { id: LEAD, noteId: NOTE }) =>
  (handler as Route)(request, { params: Promise.resolve(params) } as never);

const idOf = (email: string) =>
  testAuth.db.user!.find((user) => user.email === email)!.id as string;

const noteRow = (authorId: string | null, extra: Record<string, unknown> = {}) => ({
  id: NOTE,
  body: "Original text",
  authorId,
  author: authorId ? { id: authorId, name: "Someone", email: "leaked@example.com" } : null,
  createdAt: T0,
  updatedAt: T0,
  ...extra,
});

function req(
  method: string,
  path: string,
  cookies: unknown,
  body?: unknown,
  origin?: string | null,
) {
  return adminRequest(path, { method, cookies: cookies as string, body, origin });
}

const NOTES = `/api/admin/leads/${LEAD}/notes`;
const ONE = `${NOTES}/${NOTE}`;

function expectProtectedHeaders(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
}

function expectNoWrites() {
  expect(mocks.noteCreate).not.toHaveBeenCalled();
  expect(mocks.noteUpdate).not.toHaveBeenCalled();
  expect(mocks.noteDeleteMany).not.toHaveBeenCalled();
  expect(mocks.activityCreate).not.toHaveBeenCalled();
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
}

beforeEach(async () => {
  stubAuthEnv({ adminEmails: `${ALICE},${BOB}` });
  testAuth = createTestAuth();
  holder.auth = testAuth;
  holder.configured = true;
  mocks.leadFindUnique.mockResolvedValue({ id: LEAD });
  mocks.noteFindFirst.mockResolvedValue(null);
  mocks.noteCreate.mockImplementation(
    async ({ data }: { data: { body: string; authorId: string } }) =>
      noteRow(data.authorId, { body: data.body }),
  );
  mocks.noteUpdate.mockImplementation(async ({ data }: { data: { body: string } }) =>
    noteRow(idOf(ALICE), { body: data.body, updatedAt: new Date("2026-11-13T10:00:00.000Z") }),
  );
  mocks.noteDeleteMany.mockResolvedValue({ count: 1 });
  mocks.activityCreate.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const mock of Object.values(mocks)) mock.mockReset();
});

const operations = [
  [
    "POST add",
    (c: unknown, o?: string | null) =>
      run(POST, req("POST", NOTES, c, { body: "x" }, o), { id: LEAD }),
  ],
  [
    "PATCH edit",
    (c: unknown, o?: string | null) => run(PATCH, req("PATCH", ONE, c, { body: "x" }, o)),
  ],
  [
    "DELETE delete",
    (c: unknown, o?: string | null) => run(DELETE, req("DELETE", ONE, c, undefined, o)),
  ],
] as const;

describe.each(operations)("%s: authentication and permission", (_name, call) => {
  it("answers 401 without a session or with a forged cookie, and writes nothing", async () => {
    expect((await call(undefined)).status).toBe(401);
    expect((await call("haulix.session_token=forged")).status).toBe(401);
    expectNoWrites();
  });

  it("answers 403 for a carrier account", async () => {
    await testAuth.createUser("carrier@example.com", "carrier");
    const { jar } = await testAuth.signIn("carrier@example.com");
    const response = await call(jar);
    expect(response.status).toBe(403);
    expectProtectedHeaders(response);
    expectNoWrites();
  });

  it("answers 403 for an admin removed from ADMIN_EMAILS, and for a banned admin", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    vi.stubEnv("ADMIN_EMAILS", BOB);
    expect((await call(jar)).status).toBe(403);
    vi.stubEnv("ADMIN_EMAILS", `${ALICE},${BOB}`);
    for (const user of testAuth.db.user!) user.banned = true;
    expect((await call(jar)).status).toBe(403);
    expectNoWrites();
  });

  it("answers 403 for another origin, or no origin information (CSRF)", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    expect((await call(jar, "https://evil.test")).status).toBe(403);
    expect((await call(jar, null)).status).toBe(403);
    expectNoWrites();
  });
});

describe("POST /api/admin/leads/[id]/notes", () => {
  it("adds a note as the signed-in admin and answers 201 with safe fields", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    const response = await run(POST, req("POST", NOTES, jar, { body: "  Called.\nNo answer.  " }), {
      id: LEAD,
    });

    expect(response.status).toBe(201);
    expectProtectedHeaders(response);
    const text = await response.text();
    const body = JSON.parse(text);
    expect(body).toMatchObject({
      ok: true,
      changed: true,
      note: { body: "Called.\nNo answer.", canEdit: true, author: { id: idOf(ALICE) } },
    });
    expect(text).not.toMatch(/leaked|email|password|token/i);
    // The author comes from the session, never from the request.
    expect(mocks.noteCreate.mock.calls[0]![0].data.authorId).toBe(idOf(ALICE));
    expect(mocks.activityCreate.mock.calls[0]![0].data).toMatchObject({
      action: "NOTE_ADDED",
      actorId: idOf(ALICE),
      leadId: LEAD,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["an empty note", { body: "" }],
    ["a whitespace-only note", { body: "   \n\t  " }],
    ["a missing body", {}],
    ["a number", { body: 5 }],
    ["a note over the limit", { body: "x".repeat(NOTE_BODY_MAX + 1) }],
    ["an attempt to set the author", { body: "x", authorId: "someone" }],
    ["an attempt to set the lead", { body: "x", leadId: "other" }],
  ])("answers 422 for %s", async (_name, body) => {
    const jar = await testAuth.signedInAdmin(ALICE);
    const response = await run(POST, req("POST", NOTES, jar, body), { id: LEAD });
    expect(response.status).toBe(422);
    expect(
      Object.keys(((await response.json()) as { fieldErrors: object }).fieldErrors).length,
    ).toBeGreaterThan(0);
    expectNoWrites();
  });

  it("accepts a note of exactly the maximum length", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    const response = await run(POST, req("POST", NOTES, jar, { body: "x".repeat(NOTE_BODY_MAX) }), {
      id: LEAD,
    });
    expect(response.status).toBe(201);
  });

  it("answers 400 for non-JSON and 413 for an oversized body", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    expect((await run(POST, req("POST", NOTES, jar, "{nope"), { id: LEAD })).status).toBe(400);
    expect(
      (await run(POST, req("POST", NOTES, jar, { body: "x".repeat(40_000) }), { id: LEAD })).status,
    ).toBe(413);
    expectNoWrites();
  });

  it.each(["not-a-cuid", "seed-001", "../x", "1"])(
    "answers 404 for the malformed lead id %s",
    async (id) => {
      const jar = await testAuth.signedInAdmin(ALICE);
      const response = await run(
        POST,
        req("POST", `/api/admin/leads/${id}/notes`, jar, { body: "x" }),
        { id },
      );
      expect(response.status).toBe(404);
      expect(mocks.leadFindUnique).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );

  it("answers 404 for a lead that does not exist", async () => {
    mocks.leadFindUnique.mockResolvedValue(null);
    const jar = await testAuth.signedInAdmin(ALICE);
    expect((await run(POST, req("POST", NOTES, jar, { body: "x" }), { id: LEAD })).status).toBe(
      404,
    );
    expectNoWrites();
  });

  it("answers 200 and writes once for a repeated submission", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    mocks.noteFindFirst.mockResolvedValue(noteRow(idOf(ALICE), { body: "Same" }));
    const response = await run(POST, req("POST", NOTES, jar, { body: "Same" }), { id: LEAD });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ changed: false });
    expectNoWrites();
  });
});

describe("PATCH /api/admin/leads/[id]/notes/[noteId]", () => {
  it("lets an admin edit their own note", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    mocks.noteFindFirst.mockResolvedValue(noteRow(idOf(ALICE)));
    const response = await run(
      PATCH,
      req("PATCH", ONE, jar, { body: "Edited", expectedUpdatedAt: T0.toISOString() }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      changed: true,
      note: { body: "Edited", canEdit: true },
    });
    expect(mocks.noteUpdate.mock.calls[0]![0].where.authorId).toBe(idOf(ALICE));
    expect(mocks.activityCreate.mock.calls[0]![0].data).toMatchObject({
      action: "NOTE_EDITED",
      noteId: NOTE,
      metadata: { previousBody: "Original text" },
    });
  });

  it("answers 403 when editing ANOTHER admin's note, and changes nothing", async () => {
    await testAuth.createUser(BOB, "admin");
    const jar = await testAuth.signedInAdmin(ALICE);
    mocks.noteFindFirst.mockResolvedValue(noteRow(idOf(BOB)));

    const response = await run(PATCH, req("PATCH", ONE, jar, { body: "Hijacked" }));
    expect(response.status).toBe(403);
    const json = (await response.json()) as { code: string; message: string };
    expect(json.code).toBe("forbidden");
    expect(json.message).toMatch(/only change notes that you wrote/);
    expectNoWrites();
  });

  it("answers 403 when editing a legacy note that has no author", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    mocks.noteFindFirst.mockResolvedValue(noteRow(null));
    expect((await run(PATCH, req("PATCH", ONE, jar, { body: "Rewritten" }))).status).toBe(403);
    expectNoWrites();
  });

  it("answers 404 when the note belongs to a different lead (no cross-lead access)", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    mocks.noteFindFirst.mockResolvedValue(null);
    const response = await run(PATCH, req("PATCH", ONE, jar, { body: "x" }));
    expect(response.status).toBe(404);
    expect(mocks.noteFindFirst.mock.calls[0]![0].where).toEqual({ id: NOTE, leadId: LEAD });
    expectNoWrites();
  });

  it("answers 409 when the note changed since it was loaded", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    mocks.noteFindFirst.mockResolvedValue(
      noteRow(idOf(ALICE), { updatedAt: new Date("2026-11-14T00:00:00.000Z") }),
    );
    const response = await run(
      PATCH,
      req("PATCH", ONE, jar, { body: "x", expectedUpdatedAt: T0.toISOString() }),
    );
    expect(response.status).toBe(409);
    expectNoWrites();
  });

  it.each([
    ["an empty edit", { body: "  " }],
    ["an over-long edit", { body: "x".repeat(NOTE_BODY_MAX + 1) }],
    ["a bad timestamp", { body: "x", expectedUpdatedAt: "yesterday" }],
    ["an attempt to change the author", { body: "x", authorId: "me" }],
  ])("answers 422 for %s", async (_name, body) => {
    const jar = await testAuth.signedInAdmin(ALICE);
    expect((await run(PATCH, req("PATCH", ONE, jar, body))).status).toBe(422);
    expect(mocks.noteFindFirst).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it.each([
    [{ id: "not-a-cuid", noteId: NOTE }],
    [{ id: LEAD, noteId: "not-a-cuid" }],
    [{ id: LEAD, noteId: "../../etc" }],
  ])("answers 404 for malformed ids %j without touching the database", async (params) => {
    const jar = await testAuth.signedInAdmin(ALICE);
    expect((await run(PATCH, req("PATCH", ONE, jar, { body: "x" }), params)).status).toBe(404);
    expect(mocks.noteFindFirst).not.toHaveBeenCalled();
    expectNoWrites();
  });
});

describe("DELETE /api/admin/leads/[id]/notes/[noteId]", () => {
  it("lets an admin delete their own note", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    mocks.noteFindFirst.mockResolvedValue({ id: NOTE, body: "Gone", authorId: idOf(ALICE) });
    const response = await run(DELETE, req("DELETE", ONE, jar));

    expect(response.status).toBe(200);
    expectProtectedHeaders(response);
    await expect(response.json()).resolves.toEqual({ ok: true, noteId: NOTE });
    expect(mocks.noteDeleteMany.mock.calls[0]![0].where).toEqual({
      id: NOTE,
      leadId: LEAD,
      authorId: idOf(ALICE),
    });
    expect(mocks.activityCreate.mock.calls[0]![0].data).toMatchObject({
      action: "NOTE_DELETED",
      noteId: NOTE,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(3);
  });

  it("answers 403 when deleting ANOTHER admin's note, and removes nothing", async () => {
    await testAuth.createUser(BOB, "admin");
    const jar = await testAuth.signedInAdmin(ALICE);
    mocks.noteFindFirst.mockResolvedValue({ id: NOTE, body: "Bob's", authorId: idOf(BOB) });
    expect((await run(DELETE, req("DELETE", ONE, jar))).status).toBe(403);
    expectNoWrites();
  });

  it("answers 403 when deleting a legacy note, so imported notes can never be removed", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    mocks.noteFindFirst.mockResolvedValue({ id: NOTE, body: "Imported", authorId: null });
    expect((await run(DELETE, req("DELETE", ONE, jar))).status).toBe(403);
    expectNoWrites();
  });

  it("answers 404 for a note on another lead or a missing note", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    expect((await run(DELETE, req("DELETE", ONE, jar))).status).toBe(404);
    expectNoWrites();
  });

  it("answers 409 if the note vanished before the delete", async () => {
    const jar = await testAuth.signedInAdmin(ALICE);
    mocks.noteFindFirst.mockResolvedValue({ id: NOTE, body: "x", authorId: idOf(ALICE) });
    mocks.noteDeleteMany.mockResolvedValue({ count: 0 });
    expect((await run(DELETE, req("DELETE", ONE, jar))).status).toBe(409);
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });
});

describe("safe errors", () => {
  it("answers 503 without a database and a generic 500 on failure, never revealing details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const jar = await testAuth.signedInAdmin(ALICE);
    holder.configured = false;
    expect((await run(POST, req("POST", NOTES, jar, { body: "x" }), { id: LEAD })).status).toBe(
      503,
    );

    holder.configured = true;
    mocks.leadFindUnique.mockRejectedValue(
      new Error("FATAL postgres://u:secret@host password failed"),
    );
    const response = await run(POST, req("POST", NOTES, jar, { body: "x" }), { id: LEAD });
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toContain("server_error");
    expect(text).not.toMatch(/postgres|secret|FATAL/);
  });
});
