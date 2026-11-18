// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getLeadById } from "@/app/api/admin/leads/[id]/route";
import { GET as listLeadsRoute } from "@/app/api/admin/leads/route";

import { adminRequest, createTestAuth, stubAuthEnv, type TestAuth } from "../helpers/admin-auth";

/**
 * The real admin routes behind real Better Auth sessions (in-memory adapter,
 * real email + password sign-in). Only the lead database is mocked.
 */

const holder = vi.hoisted(() => ({ auth: null as unknown, configured: true }));
const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAuth: () => (holder.auth as { auth: unknown }).auth,
  isAuthConfigured: () => true,
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => holder.configured,
  getPrisma: () => ({
    lead: { findMany: mocks.findMany, count: mocks.count, findUnique: mocks.findUnique },
  }),
}));

const ADMIN_EMAIL = "admin@haulix.test";
const LEAD_ID = "cmi4x2k7p0000abcd1234efgh";

let testAuth: TestAuth;

const row = {
  id: LEAD_ID,
  type: "CARRIER_INQUIRY",
  status: "NEW",
  fullName: "Jane Driver",
  email: "jane@example.com",
  phone: "(555) 010-0001",
  companyName: null,
  equipment: "dry-van",
  fleetSize: 2,
  inquiryType: null,
  createdAt: new Date("2026-11-10T10:00:00Z"),
  updatedAt: new Date("2026-11-10T10:00:00Z"),
  // Private columns the database must never get a chance to leak.
  ipHash: "secret-ip-hash",
  userAgent: "secret-user-agent",
  submissionId: "secret-submission-id",
};

const detailRow = {
  ...row,
  mcNumber: null,
  dotNumber: null,
  preferredLanes: null,
  subject: null,
  message: null,
  sourcePage: "/get-started",
  notifiedAt: null,
  confirmationSentAt: null,
  contactedAt: null,
  leadNotes: [],
  activities: [],
};

type Route = (request: Request, context: never) => Promise<Response>;

const listCall = (request: Request) => (listLeadsRoute as unknown as Route)(request, {} as never);
const detailCall = (request: Request, id = LEAD_ID) =>
  (getLeadById as unknown as Route)(request, { params: Promise.resolve({ id }) } as never);

const routes = [
  ["GET /api/admin/leads", "/api/admin/leads", listCall],
  ["GET /api/admin/leads/[id]", `/api/admin/leads/${LEAD_ID}`, detailCall],
] as const;

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
  mocks.findMany.mockResolvedValue([row]);
  mocks.count.mockResolvedValue(1);
  mocks.findUnique.mockResolvedValue(detailRow);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  mocks.findMany.mockReset();
  mocks.count.mockReset();
  mocks.findUnique.mockReset();
});

describe.each(routes)("%s: authorization", (_name, path, call) => {
  it("answers 401 without a session, and never reaches the database", async () => {
    const response = await call(adminRequest(path));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: "unauthenticated" });
    expectProtectedHeaders(response);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("answers 401 for a forged session cookie", async () => {
    const response = await call(adminRequest(path, { cookies: "haulix.session_token=forged" }));
    expect(response.status).toBe(401);
  });

  it("answers 403 for a carrier account", async () => {
    await testAuth.createUser("carrier@example.com", "carrier");
    const { jar } = await testAuth.signIn("carrier@example.com");
    const response = await call(adminRequest(path, { cookies: jar }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: "forbidden" });
    expectProtectedHeaders(response);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("answers 403 for an admin who is no longer in ADMIN_EMAILS", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    expect((await call(adminRequest(path, { cookies: jar }))).status).toBe(200);

    vi.stubEnv("ADMIN_EMAILS", "someone-else@haulix.test");
    const response = await call(adminRequest(path, { cookies: jar }));
    expect(response.status).toBe(403);
    expectProtectedHeaders(response);
  });

  it("answers 403 for a banned admin", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    for (const user of testAuth.db.user!) user.banned = true;
    const response = await call(adminRequest(path, { cookies: jar }));
    expect(response.status).toBe(403);
    expectProtectedHeaders(response);
  });

  it("answers 200 for an authorized admin, with no-cache and noindex headers", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(adminRequest(path, { cookies: jar }));
    expect(response.status).toBe(200);
    expectProtectedHeaders(response);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });

  it("answers 503 when the database is not configured", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    holder.configured = false;
    const response = await call(adminRequest(path, { cookies: jar }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: "unavailable" });
    expectProtectedHeaders(response);
  });

  it("answers 500 with a generic message when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findMany.mockRejectedValue(new Error("connection string postgres://secret"));
    mocks.count.mockRejectedValue(new Error("connection string postgres://secret"));
    mocks.findUnique.mockRejectedValue(new Error("connection string postgres://secret"));
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await call(adminRequest(path, { cookies: jar }));
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("postgres://");
    expect(text).toContain("server_error");
  });
});

describe("GET /api/admin/leads", () => {
  it("returns the page with its pagination details", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await listCall(
      adminRequest("/api/admin/leads?page=2&pageSize=10&status=NEW&type=CARRIER_INQUIRY&q=jane", {
        cookies: jar,
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: true, page: 2, pageSize: 10, total: 1, totalPages: 1 });
    expect(body.leads).toHaveLength(1);

    const args = mocks.findMany.mock.calls[0]![0];
    expect(args).toMatchObject({ skip: 10, take: 10 });
    expect(args.where).toMatchObject({ status: "NEW", type: "CARRIER_INQUIRY" });
  });

  it.each([
    ["page=0", "page"],
    ["page=abc", "page"],
    ["pageSize=7", "pageSize"],
    ["pageSize=1000", "pageSize"],
    ["type=NEWSLETTER", "type"],
    ["status=done", "status"],
    ["sort=ipHash", "sort"],
    ["dir=sideways", "dir"],
    [`q=${"x".repeat(101)}`, "q"],
  ])("answers 422 with a field error for %s", async (queryString, field) => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await listCall(
      adminRequest(`/api/admin/leads?${queryString}`, { cookies: jar }),
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as { code: string; fieldErrors: Record<string, string[]> };
    expect(body.code).toBe("validation_failed");
    expect(Object.keys(body.fieldErrors)).toEqual([field]);
    expectProtectedHeaders(response);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("never exposes private fields or session data", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await listCall(adminRequest("/api/admin/leads", { cookies: jar }));
    const text = await response.text();
    expect(text).not.toMatch(/ipHash|userAgent|submissionId|secret-|password|token|session/i);
    expect(text).toContain("jane@example.com");
  });
});

describe("GET /api/admin/leads/[id]", () => {
  it("returns the lead detail", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await detailCall(
      adminRequest(`/api/admin/leads/${LEAD_ID}`, { cookies: jar }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      lead: { id: LEAD_ID, notes: [], activity: [], sourcePage: "/get-started" },
    });
    expect(mocks.findUnique.mock.calls[0]![0].where).toEqual({ id: LEAD_ID });
  });

  it.each(["not-a-cuid", "seed-001", "../etc/passwd", "1", "a%20b"])(
    "answers 404 for the malformed id %s without querying the database",
    async (id) => {
      const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
      const response = await detailCall(
        adminRequest(`/api/admin/leads/${id}`, { cookies: jar }),
        id,
      );
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({ ok: false, code: "not_found" });
      expectProtectedHeaders(response);
      expect(mocks.findUnique).not.toHaveBeenCalled();
    },
  );

  it("answers 404 when the lead does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await detailCall(
      adminRequest(`/api/admin/leads/${LEAD_ID}`, { cookies: jar }),
    );
    expect(response.status).toBe(404);
    expectProtectedHeaders(response);
  });

  it("never exposes private fields or session data", async () => {
    const jar = await testAuth.signedInAdmin(ADMIN_EMAIL);
    const response = await detailCall(
      adminRequest(`/api/admin/leads/${LEAD_ID}`, { cookies: jar }),
    );
    const text = await response.text();
    expect(text).not.toMatch(/ipHash|userAgent|submissionId|secret-|password|token|metadata/i);
  });
});
