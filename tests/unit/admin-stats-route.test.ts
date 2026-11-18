// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/admin/stats/route";

import { adminRequest, createTestAuth, stubAuthEnv, type TestAuth } from "../helpers/admin-auth";

/**
 * GET /api/admin/stats behind real Better Auth sessions (in-memory adapter).
 * Only the lead database is mocked.
 */

const holder = vi.hoisted(() => ({ auth: null as unknown, configured: true }));
const mocks = vi.hoisted(() => ({ groupBy: vi.fn(), findMany: vi.fn() }));

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAuth: () => (holder.auth as { auth: unknown }).auth,
  isAuthConfigured: () => true,
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => holder.configured,
  getPrisma: () => ({ lead: { groupBy: mocks.groupBy, findMany: mocks.findMany } }),
}));

const ADMIN_EMAIL = "admin@haulix.test";
const PATH = "/api/admin/stats";
let testAuth: TestAuth;

type Route = (request: Request, context: never) => Promise<Response>;
const call = (request: Request) => (GET as unknown as Route)(request, {} as never);

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
  mocks.groupBy.mockResolvedValue([
    { status: "NEW", type: "CARRIER_INQUIRY", _count: { _all: 3 } },
    { status: "REJECTED", type: "CONTACT", _count: { _all: 1 } },
    { status: "SPAM", type: "CONTACT", _count: { _all: 2 } },
  ]);
  mocks.findMany.mockResolvedValue([
    {
      id: "cmi4x2k7p0000abcd1234efgh",
      type: "CARRIER_INQUIRY",
      status: "NEW",
      fullName: "Jane Driver",
      email: "jane@example.com",
      phone: null,
      companyName: null,
      equipment: null,
      fleetSize: null,
      inquiryType: null,
      createdAt: new Date("2026-11-18T10:00:00Z"),
      updatedAt: new Date("2026-11-18T10:00:00Z"),
      ipHash: "secret-ip-hash",
      submissionId: "secret-submission-id",
    },
  ]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  mocks.groupBy.mockReset();
  mocks.findMany.mockReset();
});

describe("GET /api/admin/stats: authorization", () => {
  it("answers 401 without a session, and never reaches the database", async () => {
    const response = await call(adminRequest(PATH));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: "unauthenticated" });
    expectProtectedHeaders(response);
    expect(mocks.groupBy).not.toHaveBeenCalled();
  });

  it("answers 401 for a forged session cookie", async () => {
    expect(
      (await call(adminRequest(PATH, { cookies: "haulix.session_token=forged" }))).status,
    ).toBe(401);
  });

  it("answers 403 for a carrier account", async () => {
    await testAuth.createUser("carrier@example.com", "carrier");
    const { jar } = await testAuth.signIn("carrier@example.com");
    const response = await call(adminRequest(PATH, { cookies: jar }));
    expect(response.status).toBe(403);
    expectProtectedHeaders(response);
    expect(mocks.groupBy).not.toHaveBeenCalled();
  });

  it("answers 403 for an admin removed from ADMIN_EMAILS", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    vi.stubEnv("ADMIN_EMAILS", "someone-else@haulix.test");
    expect((await call(adminRequest(PATH, { cookies: jar }))).status).toBe(403);
  });

  it("answers 403 for a banned admin", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    for (const user of testAuth.db.user!) user.banned = true;
    expect((await call(adminRequest(PATH, { cookies: jar }))).status).toBe(403);
  });
});

describe("GET /api/admin/stats: responses", () => {
  it("returns the stats to an authorized admin, uncached", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(adminRequest(PATH, { cookies: jar }));
    expect(response.status).toBe(200);
    expectProtectedHeaders(response);

    const body = (await response.json()) as { ok: boolean; stats: Record<string, unknown> };
    expect(body.ok).toBe(true);
    expect(body.stats).toMatchObject({
      totalLeads: 6,
      byStatus: { NEW: 3, CONTACTED: 0, QUALIFIED: 0, ONBOARDED: 0, REJECTED: 1, SPAM: 2 },
      byType: { CARRIER_INQUIRY: 3, CONTACT: 3 },
    });
    expect(body.stats.recentLeads).toHaveLength(1);
  });

  it("never exposes private fields or session data", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const text = await (await call(adminRequest(PATH, { cookies: jar }))).text();
    expect(text).not.toMatch(/ipHash|submissionId|secret-|password|token|session/i);
  });

  it("answers 503 when the database is not configured", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    holder.configured = false;
    const response = await call(adminRequest(PATH, { cookies: jar }));
    expect(response.status).toBe(503);
    expectProtectedHeaders(response);
  });

  it("answers 500 with a generic message when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.groupBy.mockRejectedValue(new Error("postgres://secret"));
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(adminRequest(PATH, { cookies: jar }));
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toContain("server_error");
    expect(text).not.toContain("postgres://");
  });
});
