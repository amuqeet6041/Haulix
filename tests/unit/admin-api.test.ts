// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  ADMIN_MAX_BODY_BYTES,
  adminConflict,
  adminError,
  adminNotFound,
  adminOk,
  parseJson,
  parseQuery,
  readRouteParam,
} from "@/lib/admin-api";
import { leadIdSchema, leadListQuerySchema, leadNoteSchema } from "@/validations/admin-leads";

const CUID = "cmi4x2k7p0000abcd1234efgh";

function expectProtected(response: Response) {
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
}

function jsonRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/admin/leads/x/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

describe("admin responses", () => {
  it("wraps success bodies with ok: true and protected headers", async () => {
    const response = adminOk({ lead: { id: "1" } }, 201);
    expect(response.status).toBe(201);
    expectProtected(response);
    await expect(response.json()).resolves.toEqual({ ok: true, lead: { id: "1" } });
  });

  it.each([
    ["invalid_request", 400],
    ["too_large", 413],
    ["validation_failed", 422],
    ["not_found", 404],
    ["conflict", 409],
    ["server_error", 500],
  ] as const)("maps %s to HTTP %i with a default message", async (code, status) => {
    const response = adminError(code);
    expect(response.status).toBe(status);
    expectProtected(response);
    const body = (await response.json()) as { ok: boolean; code: string; message: string };
    expect(body).toMatchObject({ ok: false, code });
    expect(body.message.length).toBeGreaterThan(0);
  });

  it("has shortcuts for not found and conflict, with custom messages", async () => {
    expect(adminNotFound().status).toBe(404);
    const conflict = adminConflict("Someone else updated this lead.");
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({
      message: "Someone else updated this lead.",
    });
  });
});

describe("parseQuery", () => {
  it("returns parsed data for a valid query", () => {
    const result = parseQuery(
      new Request("http://localhost:3000/api/admin/leads?page=2&status=NEW"),
      leadListQuerySchema,
    );
    expect(result.ok && result.data).toMatchObject({ page: 2, status: "NEW", pageSize: 25 });
  });

  it("returns a 422 with field errors for an invalid query", async () => {
    const result = parseQuery(
      new URL("http://localhost:3000/api/admin/leads?pageSize=7&sort=email"),
      leadListQuerySchema,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(422);
    const body = (await result.response.json()) as { code: string; fieldErrors: object };
    expect(body.code).toBe("validation_failed");
    expect(Object.keys(body.fieldErrors).sort()).toEqual(["pageSize", "sort"]);
  });
});

describe("parseJson", () => {
  it("parses and validates a JSON body", async () => {
    const result = await parseJson(jsonRequest(JSON.stringify({ body: " hi " })), leadNoteSchema);
    expect(result.ok && result.data).toEqual({ body: "hi" });
  });

  it("returns 400 for malformed JSON", async () => {
    const result = await parseJson(jsonRequest("{not json"), leadNoteSchema);
    expect(!result.ok && result.response.status).toBe(400);
  });

  it("returns 422 for a body that fails the schema", async () => {
    const result = await parseJson(jsonRequest(JSON.stringify({ body: "" })), leadNoteSchema);
    expect(!result.ok && result.response.status).toBe(422);
  });

  it("returns 413 for an oversized body", async () => {
    const big = JSON.stringify({ body: "x".repeat(ADMIN_MAX_BODY_BYTES + 10) });
    const result = await parseJson(jsonRequest(big), leadNoteSchema);
    expect(!result.ok && result.response.status).toBe(413);
  });
});

describe("readRouteParam (Next 16 Promise params)", () => {
  it("awaits params and validates the id", async () => {
    const result = await readRouteParam(
      { params: Promise.resolve({ id: CUID }) },
      "id",
      leadIdSchema,
    );
    expect(result.ok && result.data).toBe(CUID);
  });

  it("answers 404 for an invalid or missing id", async () => {
    for (const params of [{ id: "not-a-cuid!" }, {}]) {
      const result = await readRouteParam({ params: Promise.resolve(params) }, "id", leadIdSchema);
      expect(!result.ok && result.response.status).toBe(404);
    }
  });
});
