// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  submitCarrierInquiry,
  submitContactMessage,
  toCarrierInquiryRecord,
  toContactRecord,
} from "@/services/lead.service";
import { subscribeToNewsletter } from "@/services/newsletter.service";
import {
  carrierInquirySchema,
  contactSchema,
  type CarrierInquiryData,
  type ContactData,
} from "@/validations";

const mocks = vi.hoisted(() => ({
  leadCreate: vi.fn(),
  newsletterUpsert: vi.fn(),
  resendSend: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => Boolean(process.env.DATABASE_URL),
  getPrisma: () => ({
    lead: { create: mocks.leadCreate },
    newsletterSubscriber: { upsert: mocks.newsletterUpsert },
  }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.resendSend };
  },
}));

const inquiry: CarrierInquiryData = carrierInquirySchema.parse({
  fullName: "Jane Driver",
  email: "jane.driver@example.com",
  phone: "5551234567",
  equipment: "dry-van",
  fleetSize: 2,
});

const contact: ContactData = contactSchema.parse({
  fullName: "Jane Driver",
  email: "jane.driver@example.com",
  inquiryType: "PRICING",
  message: "I would like to know more about dispatch.",
});

/** Fields only the server may set. */
const serverManagedFields = [
  "status",
  "sourcePage",
  "submissionId",
  "ipHash",
  "userAgent",
  "notifiedAt",
  "confirmationSentAt",
  "createdAt",
  "updatedAt",
  "notes",
  "contactedAt",
];

/** Personal data that must never appear in server logs. */
const personalData = [inquiry.fullName, inquiry.email, inquiry.phone];

function configureEmail() {
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("CONTACT_EMAIL", "team@example.com");
}

function loggedText(): string {
  const calls = [...vi.mocked(console.error).mock.calls, ...vi.mocked(console.warn).mock.calls];
  return calls.map((args) => args.map(String).join(" ")).join("\n");
}

function storedRecord(): Record<string, unknown> {
  const call = mocks.leadCreate.mock.calls[0] as [{ data: Record<string, unknown> }] | undefined;
  if (!call) throw new Error("lead.create was not called");
  return call[0].data;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("CONTACT_EMAIL", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.leadCreate.mockResolvedValue({ id: "lead_1" });
  mocks.newsletterUpsert.mockResolvedValue({});
  mocks.resendSend.mockResolvedValue({ data: { id: "email_1" }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("lead records", () => {
  it("stores a carrier inquiry as CARRIER_INQUIRY with its dispatch details", () => {
    expect(toCarrierInquiryRecord(inquiry)).toMatchObject({
      type: "CARRIER_INQUIRY",
      phone: "5551234567",
      equipment: "dry-van",
      fleetSize: 2,
      companyName: null,
      message: null,
    });
  });

  it("stores a contact message as CONTACT with its inquiry type", () => {
    expect(toContactRecord(contact)).toMatchObject({
      type: "CONTACT",
      inquiryType: "PRICING",
      phone: null,
      equipment: null,
      fleetSize: null,
      subject: null,
    });
  });

  it("never copies server-managed fields from client input", () => {
    const hostile = {
      type: "CONTACT",
      status: "QUALIFIED",
      submissionId: "chosen-by-client",
      ipHash: "x",
      createdAt: "2000-01-01",
      notes: "VIP",
    };
    const parsedInquiry = carrierInquirySchema.parse({ ...inquiry, ...hostile });
    const parsedContact = contactSchema.parse({ ...contact, ...hostile, type: "CARRIER_INQUIRY" });

    const inquiryRecord = toCarrierInquiryRecord(parsedInquiry);
    const contactRecord = toContactRecord(parsedContact);
    expect(inquiryRecord.type).toBe("CARRIER_INQUIRY");
    expect(contactRecord.type).toBe("CONTACT");
    for (const field of serverManagedFields) {
      expect(inquiryRecord).not.toHaveProperty(field);
      expect(contactRecord).not.toHaveProperty(field);
    }
  });
});

describe("submitCarrierInquiry", () => {
  it("is not_configured without a database, even when email is configured", async () => {
    configureEmail();
    await expect(submitCarrierInquiry(inquiry)).resolves.toEqual({
      ok: false,
      reason: "not_configured",
    });
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });

  it("succeeds when stored and the notification is sent", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();

    await expect(submitCarrierInquiry(inquiry)).resolves.toEqual({ ok: true });
    expect(storedRecord().type).toBe("CARRIER_INQUIRY");
    expect(mocks.resendSend).toHaveBeenCalledOnce();
  });

  it("keeps the stored lead and still succeeds when the email fails", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.resendSend.mockResolvedValue({
      data: null,
      error: { name: "application_error", message: `Bad recipient ${inquiry.email}` },
    });

    await expect(submitCarrierInquiry(inquiry)).resolves.toEqual({ ok: true });
    expect(loggedText()).toContain("lead_1");
    expect(loggedText()).toContain("application_error");
    for (const value of personalData) expect(loggedText()).not.toContain(value);
  });

  it("succeeds when stored but Resend throws", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.resendSend.mockRejectedValue(new Error(`Timeout sending for ${inquiry.email}`));

    await expect(submitCarrierInquiry(inquiry)).resolves.toEqual({ ok: true });
    for (const value of personalData) expect(loggedText()).not.toContain(value);
  });

  it("fails, and sends no email, when the database write fails", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.leadCreate.mockRejectedValue(
      Object.assign(new Error(`Unique constraint failed for ${inquiry.email}`), { code: "P2002" }),
    );

    await expect(submitCarrierInquiry(inquiry)).resolves.toEqual({ ok: false, reason: "failed" });
    expect(mocks.resendSend).not.toHaveBeenCalled();
    expect(loggedText()).toContain("code=P2002");
    for (const value of personalData) expect(loggedText()).not.toContain(value);
  });

  it("stores the lead and names the missing variable when email config is incomplete", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");

    await expect(submitCarrierInquiry(inquiry)).resolves.toEqual({ ok: true });
    expect(mocks.resendSend).not.toHaveBeenCalled();
    expect(loggedText()).toContain("CONTACT_EMAIL");
    expect(loggedText()).not.toContain("re_test_key");
  });
});

describe("submitContactMessage", () => {
  it("is not_configured without a database, even when email is configured", async () => {
    configureEmail();
    await expect(submitContactMessage(contact)).resolves.toEqual({
      ok: false,
      reason: "not_configured",
    });
  });

  it("stores the message in the Lead table as CONTACT", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");

    await expect(submitContactMessage(contact)).resolves.toEqual({ ok: true });
    expect(storedRecord()).toMatchObject({ type: "CONTACT", inquiryType: "PRICING" });
  });

  it("keeps the stored message when the email fails", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.resendSend.mockResolvedValue({ data: null, error: { name: "rate_limit_exceeded" } });

    await expect(submitContactMessage(contact)).resolves.toEqual({ ok: true });
    expect(loggedText()).toContain("lead_1");
  });

  it("fails when the database write fails, even though email would work", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.leadCreate.mockRejectedValue(new Error("connection refused"));

    await expect(submitContactMessage(contact)).resolves.toEqual({ ok: false, reason: "failed" });
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });
});

describe("subscribeToNewsletter", () => {
  it("logs a failure without the email address", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    mocks.newsletterUpsert.mockRejectedValue(new Error(`Failed for ${inquiry.email}`));

    await expect(subscribeToNewsletter({ email: inquiry.email })).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
    expect(loggedText()).not.toContain(inquiry.email);
  });
});
