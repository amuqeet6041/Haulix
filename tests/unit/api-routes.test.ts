// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postContact } from "@/app/api/contact/route";
import { POST as postLead } from "@/app/api/leads/route";

/**
 * These run the real route, validation and service code. With no database or
 * email configured nothing external is touched (the Prisma client is lazy).
 */

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validContact = {
  fullName: "Jane Driver",
  email: "jane@example.com",
  subject: "Dispatch question",
  message: "I would like to know more about dispatch.",
  website: "",
};

const validLead = {
  fullName: "Jane Driver",
  email: "jane@example.com",
  phone: "(555) 123-4567",
  equipment: "dry-van",
  truckCount: 2,
  website: "",
};

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("CONTACT_EMAIL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/contact", () => {
  it("returns 503 when the database is not configured", async () => {
    const response = await postContact(jsonRequest("http://test/api/contact", validContact));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
  });

  it("returns 503, not 500, when Resend is only partly configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    const response = await postContact(jsonRequest("http://test/api/contact", validContact));
    expect(response.status).toBe(503);
  });

  it("returns 422 with field errors for invalid input", async () => {
    const response = await postContact(
      jsonRequest("http://test/api/contact", { ...validContact, email: "nope", message: "Hi" }),
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as { fieldErrors: Record<string, string[]> };
    expect(Object.keys(body.fieldErrors).sort()).toEqual(["email", "message"]);
  });

  it("returns 400 for a body that is not JSON", async () => {
    const response = await postContact(jsonRequest("http://test/api/contact", "<html>"));
    expect(response.status).toBe(400);
  });

  it("silently accepts a filled honeypot", async () => {
    const response = await postContact(
      jsonRequest("http://test/api/contact", { ...validContact, website: "http://spam.test" }),
    );
    expect(response.status).toBe(200);
  });
});

describe("POST /api/leads", () => {
  it("returns 503 when only email is configured (the database is the source of truth)", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("CONTACT_EMAIL", "team@example.com");
    const response = await postLead(jsonRequest("http://test/api/leads", validLead));
    expect(response.status).toBe(503);
  });

  it("returns 422 with a phone field error", async () => {
    const response = await postLead(
      jsonRequest("http://test/api/leads", { ...validLead, phone: "123" }),
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as { fieldErrors: Record<string, string[]> };
    expect(body.fieldErrors.phone).toBeDefined();
  });
});
