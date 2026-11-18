// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "@/app/api/admin/leads/[id]/status/route";
import { leadStatusValues } from "@/content/lead-status";

import {
  adminRequest,
  createTestAuth,
  stubAuthEnv,
  TEST_BASE,
  type TestAuth,
} from "../helpers/admin-auth";

/**
 * PATCH /api/admin/leads/[id]/status behind real Better Auth sessions
 * (in-memory adapter). Only the lead database and cache revalidation are mocked.
 */

const holder = vi.hoisted(() => ({ auth: null as unknown, configured: true }));
const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
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
        lead: { findUnique: mocks.findUnique, update: mocks.update },
        leadActivity: { create: mocks.activityCreate },
      }),
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const ADMIN_EMAIL = "admin@haulix.test";
const ID = "cmi4x2k7p0000abcd1234efgh";
const PATH = `/api/admin/leads/${ID}/status`;

let testAuth: TestAuth;

type Route = (request: Request, context: never) => Promise<Response>;
const call = (request: Request, id = ID) =>
  (PATCH as unknown as Route)(request, { params: Promise.resolve({ id }) } as never);

const row = (status: string) => ({
  id: ID,
  status,
  updatedAt: new Date("2026-11-18T12:00:00Z"),
  contactedAt: null,
  ipHash: "secret-ip-hash",
  submissionId: "secret-submission-id",
});

function patch(
  cookies: unknown,
  body: unknown,
  options: { id?: string; origin?: string | null } = {},
) {
  return adminRequest(`/api/admin/leads/${options.id ?? ID}/status`, {
    method: "PATCH",
    cookies: cookies as string,
    body,
    origin: options.origin,
  });
}

function expectProtectedHeaders(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  expect(response.headers.get("Pragma")).toBe("no-cache");
  expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
}

beforeEach(() => {
  stubAuthEnv({ adminEmails: ADMIN_EMAIL });
  testAuth = createTestAuth();
  holder.auth = testAuth;
  holder.configured = true;
  mocks.findUnique.mockResolvedValue(row("NEW"));
  mocks.update.mockImplementation(async ({ data }: { data: { status: string } }) =>
    row(data.status),
  );
  mocks.activityCreate.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const mock of Object.values(mocks)) mock.mockReset();
});

function expectNothingWritten() {
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.activityCreate).not.toHaveBeenCalled();
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
}

describe("PATCH /api/admin/leads/[id]/status: authentication and permission", () => {
  it("answers 401 without a session and writes nothing", async () => {
    const response = await call(adminRequest(PATH, { method: "PATCH", body: { status: "SPAM" } }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: "unauthenticated" });
    expectProtectedHeaders(response);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("answers 401 for a forged session cookie", async () => {
    const response = await call(patch("haulix.session_token=forged", { status: "SPAM" }));
    expect(response.status).toBe(401);
    expectNothingWritten();
  });

  it("answers 403 for a carrier account and writes nothing", async () => {
    await testAuth.createUser("carrier@example.com", "carrier");
    const { jar } = await testAuth.signIn("carrier@example.com");
    const response = await call(patch(jar, { status: "SPAM" }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "forbidden" });
    expectProtectedHeaders(response);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("answers 403 for an admin removed from ADMIN_EMAILS", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    vi.stubEnv("ADMIN_EMAILS", "someone-else@haulix.test");
    expect((await call(patch(jar, { status: "SPAM" }))).status).toBe(403);
    expectNothingWritten();
  });

  it("answers 403 for a banned admin", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    for (const user of testAuth.db.user!) user.banned = true;
    expect((await call(patch(jar, { status: "SPAM" }))).status).toBe(403);
    expectNothingWritten();
  });

  it("answers 403 for a request from another origin, even with a valid admin session", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, { status: "SPAM" }, { origin: "https://evil.test" }));
    expect(response.status).toBe(403);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("answers 403 for a request with no origin information at all", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, { status: "SPAM" }, { origin: null }));
    expect(response.status).toBe(403);
    expectNothingWritten();
  });
});

describe("PATCH /api/admin/leads/[id]/status: success", () => {
  it("updates the status, records the activity, and returns only safe fields", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, { status: "QUALIFIED", expectedStatus: "NEW" }));

    expect(response.status).toBe(200);
    expectProtectedHeaders(response);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({
      ok: true,
      changed: true,
      lead: {
        id: ID,
        status: "QUALIFIED",
        updatedAt: "2026-11-18T12:00:00.000Z",
        contactedAt: null,
      },
    });
    expect(text).not.toMatch(/ipHash|submissionId|secret-|password|token|session/i);

    expect(mocks.update).toHaveBeenCalledTimes(1);
    const activity = mocks.activityCreate.mock.calls[0]![0].data;
    expect(activity).toMatchObject({
      leadId: ID,
      action: "STATUS_CHANGED",
      fromStatus: "NEW",
      toStatus: "QUALIFIED",
    });
    // The actor is the signed-in admin's own user id, taken from the session, never the request.
    expect(activity.actorId).toBe(testAuth.db.user![0]!.id);
  });

  it.each(leadStatusValues)("accepts the %s status", async (status) => {
    mocks.findUnique.mockResolvedValue(row(status === "SPAM" ? "NEW" : "SPAM"));
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, { status }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ lead: { status } });
  });

  it("refreshes the dashboard, the leads list and the detail pages after a change", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    await call(patch(jar, { status: "CONTACTED" }));
    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/admin"],
      ["/admin/leads"],
      ["/admin/leads/[id]", "page"],
    ]);
  });

  it("does not refresh anything when the status was already set", async () => {
    mocks.findUnique.mockResolvedValue(row("SPAM"));
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, { status: "SPAM" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, changed: false });
    expectNothingWritten();
  });

  it("still succeeds if refreshing the cache fails, since the status is already saved", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.revalidatePath.mockImplementation(() => {
      throw new Error("cache unavailable");
    });
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, { status: "SPAM" }));
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });
});

describe("PATCH /api/admin/leads/[id]/status: invalid input", () => {
  it.each([
    ["an unknown status", { status: "DONE" }],
    ["a lowercase status", { status: "spam" }],
    ["no status", {}],
    ["a number", { status: 3 }],
    ["null", { status: null }],
    ["an unknown expected status", { status: "SPAM", expectedStatus: "ARCHIVED" }],
    ["fields it must not accept", { status: "SPAM", contactedAt: "2000-01-01" }],
    ["an attempt to set the actor", { status: "SPAM", actorId: "someone" }],
  ])("answers 422 for %s, without writing", async (_name, body) => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, body));
    expect(response.status).toBe(422);
    const json = (await response.json()) as { code: string; fieldErrors: object };
    expect(json.code).toBe("validation_failed");
    expect(Object.keys(json.fieldErrors).length).toBeGreaterThan(0);
    expectProtectedHeaders(response);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("answers 400 for a body that is not JSON", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, "{not json"));
    expect(response.status).toBe(400);
    expectNothingWritten();
  });

  it("answers 413 for an oversized body", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, { status: "SPAM", pad: "x".repeat(40_000) }));
    expect(response.status).toBe(413);
    expectNothingWritten();
  });

  it.each(["not-a-cuid", "seed-001", "../etc/passwd", "1", "a%20b"])(
    "answers 404 for the malformed id %s without reading or writing",
    async (id) => {
      const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
      const response = await call(patch(jar, { status: "SPAM" }, { id }), id);
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({ code: "not_found" });
      expect(mocks.findUnique).not.toHaveBeenCalled();
      expectNothingWritten();
    },
  );

  it("answers 404 for an id that does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, { status: "SPAM" }));
    expect(response.status).toBe(404);
    expectNothingWritten();
  });
});

describe("PATCH /api/admin/leads/[id]/status: conflicts and failures", () => {
  it("answers 409 when the lead was changed since the admin loaded it", async () => {
    mocks.findUnique.mockResolvedValue(row("CONTACTED"));
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, { status: "SPAM", expectedStatus: "NEW" }));
    expect(response.status).toBe(409);
    const json = (await response.json()) as { code: string; message: string };
    expect(json.code).toBe("conflict");
    expect(json.message).toMatch(/updated by someone else/);
    expectProtectedHeaders(response);
    expectNothingWritten();
  });

  it("answers 409 when another admin wins the race during the update", async () => {
    mocks.update.mockRejectedValue(Object.assign(new Error("not found"), { code: "P2025" }));
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    expect((await call(patch(jar, { status: "SPAM" }))).status).toBe(409);
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("answers 503 when the database is not configured", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    holder.configured = false;
    const response = await call(patch(jar, { status: "SPAM" }));
    expect(response.status).toBe(503);
    expectProtectedHeaders(response);
  });

  it("answers 500 with a generic message and no internal details when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.update.mockRejectedValue(
      new Error("FATAL password authentication failed postgres://u:secret@host"),
    );
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, { status: "SPAM" }));
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toContain("server_error");
    expect(text).not.toMatch(/postgres|secret|password authentication|FATAL/);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("uses the same origin the other admin routes accept (the request's own)", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(patch(jar, { status: "SPAM" }, { origin: TEST_BASE }));
    expect(response.status).toBe(200);
  });
});
