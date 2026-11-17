// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as postContact } from "@/app/api/contact/route";
import { POST as postLead } from "@/app/api/leads/route";
import { submitCarrierInquiry, submitContactMessage } from "@/services/lead.service";

vi.mock("@/services/lead.service", () => ({
  submitCarrierInquiry: vi.fn(async () => ({ ok: true })),
  submitContactMessage: vi.fn(async () => ({ ok: true })),
}));

const uuid = "3f1c2b8e-5d4a-4c1e-9a7b-2e6f8d9c0a1b";

function post(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(url).origin,
      "X-Form-Elapsed-Ms": "8000",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("API routes pass server-derived metadata to the lead service", () => {
  it("contact: source page from Referer, submission id from the header", async () => {
    const response = await postContact(
      post(
        "http://localhost:3000/api/contact",
        {
          fullName: "Jane Driver",
          email: "jane@example.com",
          inquiryType: "PRICING",
          message: "I would like to know more about dispatch.",
          sourcePage: "/forged",
          submissionId: "forged",
        },
        {
          referer: "http://localhost:3000/contact",
          "Idempotency-Key": uuid,
          "x-forwarded-for": "203.0.113.7, 10.0.0.1",
          "user-agent": "Mozilla/5.0 Test",
        },
      ),
    );

    expect(response.status).toBe(200);
    const [data, meta] = vi.mocked(submitContactMessage).mock.calls[0]!;
    expect(meta).toMatchObject({
      sourcePage: "/contact",
      submissionId: uuid,
      userAgent: "Mozilla/5.0 Test",
    });
    // Only a 64-char keyed hash of the first forwarded IP is passed on, never the IP.
    expect(meta?.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(meta)).not.toContain("203.0.113.7");
    expect(data).not.toHaveProperty("sourcePage");
    expect(data).not.toHaveProperty("submissionId");
  });

  it("leads: cross-origin Referer and malformed key are ignored", async () => {
    const response = await postLead(
      post(
        "http://localhost:3000/api/leads",
        {
          fullName: "Jane Driver",
          email: "jane@example.com",
          phone: "(555) 123-4567",
          equipment: "flatbed",
          fleetSize: 3,
        },
        { referer: "https://elsewhere.test/get-started", "Idempotency-Key": "not-a-uuid" },
      ),
    );

    expect(response.status).toBe(200);
    const [data, meta] = vi.mocked(submitCarrierInquiry).mock.calls[0]!;
    expect(meta).toMatchObject({
      sourcePage: undefined,
      submissionId: undefined,
      ipHash: undefined,
    });
    expect(data).toMatchObject({ equipment: "flatbed", fleetSize: 3 });
  });

  it("does not call the service for a honeypot hit", async () => {
    await postContact(
      post("http://localhost:3000/api/contact", {
        fullName: "Bot",
        email: "bot@example.com",
        inquiryType: "GENERAL",
        message: "Buy cheap things now please.",
        website: "http://spam.test",
      }),
    );
    expect(submitContactMessage).not.toHaveBeenCalled();
  });
});
