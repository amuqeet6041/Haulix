// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postContact } from "@/app/api/contact/route";
import { POST as postLead } from "@/app/api/leads/route";

/**
 * These run the real route, validation and service code. With no database or
 * email configured nothing external is touched (the Prisma client is lazy).
 */

/** A request as the site's own form sends it: same Origin and a realistic fill time. */
function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(url).origin,
      "X-Form-Elapsed-Ms": "8000",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validContact = {
  fullName: "Jane Driver",
  email: "jane@example.com",
  inquiryType: "GENERAL",
  message: "I would like to know more about dispatch.",
  website: "",
};

const validLead = {
  fullName: "Jane Driver",
  email: "jane@example.com",
  phone: "(555) 123-4567",
  equipment: "dry-van",
  fleetSize: 2,
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

  it("returns 422 when the inquiry type is missing or unknown", async () => {
    const withoutType: Partial<typeof validContact> = { ...validContact };
    delete withoutType.inquiryType;
    for (const body of [withoutType, { ...validContact, inquiryType: "LOANS" }]) {
      const response = await postContact(jsonRequest("http://test/api/contact", body));
      expect(response.status).toBe(422);
      const json = (await response.json()) as { fieldErrors: Record<string, string[]> };
      expect(Object.keys(json.fieldErrors)).toEqual(["inquiryType"]);
    }
  });

  it("ignores server-managed fields instead of rejecting or storing them", async () => {
    const response = await postContact(
      jsonRequest("http://test/api/contact", {
        ...validContact,
        status: "QUALIFIED",
        submissionId: "client-chosen",
      }),
    );
    // Passes validation; 503 only because no database is configured in tests.
    expect(response.status).toBe(503);
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

  it("returns 422 when equipment or fleet size is missing", async () => {
    const rest: Partial<typeof validLead> = { ...validLead };
    delete rest.equipment;
    delete rest.fleetSize;
    const response = await postLead(jsonRequest("http://test/api/leads", rest));
    expect(response.status).toBe(422);
    const body = (await response.json()) as { fieldErrors: Record<string, string[]> };
    expect(Object.keys(body.fieldErrors).sort()).toEqual(["equipment", "fleetSize"]);
  });
});
