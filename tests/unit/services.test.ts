// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { submitContactMessage } from "@/services/contact.service";
import { submitLead } from "@/services/lead.service";
import { subscribeToNewsletter } from "@/services/newsletter.service";
import { contactSchema, leadSchema, type ContactData, type LeadData } from "@/validations";

const mocks = vi.hoisted(() => ({
  leadCreate: vi.fn(),
  contactCreate: vi.fn(),
  newsletterUpsert: vi.fn(),
  resendSend: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => Boolean(process.env.DATABASE_URL),
  getPrisma: () => ({
    lead: { create: mocks.leadCreate },
    contactMessage: { create: mocks.contactCreate },
    newsletterSubscriber: { upsert: mocks.newsletterUpsert },
  }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.resendSend };
  },
}));

const lead: LeadData = leadSchema.parse({
  fullName: "Jane Driver",
  email: "jane.driver@example.com",
  phone: "5551234567",
  equipment: "dry-van",
  truckCount: 2,
});

const contact: ContactData = contactSchema.parse({
  fullName: "Jane Driver",
  email: "jane.driver@example.com",
  subject: "Dispatch question",
  message: "I would like to know more about dispatch.",
});

/** Personal data that must never appear in server logs. */
const personalData = [lead.fullName, lead.email, lead.phone];

function configureEmail() {
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("CONTACT_EMAIL", "team@example.com");
}

function loggedText(): string {
  const calls = [...vi.mocked(console.error).mock.calls, ...vi.mocked(console.warn).mock.calls];
  return calls.map((args) => args.map(String).join(" ")).join("\n");
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("CONTACT_EMAIL", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.leadCreate.mockResolvedValue({ id: "lead_1" });
  mocks.contactCreate.mockResolvedValue({ id: "msg_1" });
  mocks.newsletterUpsert.mockResolvedValue({});
  mocks.resendSend.mockResolvedValue({ data: { id: "email_1" }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("submitLead", () => {
  it("is not_configured without a database, even when email is configured", async () => {
    configureEmail();
    await expect(submitLead(lead)).resolves.toEqual({ ok: false, reason: "not_configured" });
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });

  it("succeeds when stored and the notification is sent", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();

    await expect(submitLead(lead)).resolves.toEqual({ ok: true });
    expect(mocks.leadCreate).toHaveBeenCalledOnce();
    expect(mocks.resendSend).toHaveBeenCalledOnce();
  });

  it("keeps the stored lead and still succeeds when the email fails", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.resendSend.mockResolvedValue({
      data: null,
      error: { name: "application_error", message: `Bad recipient ${lead.email}` },
    });

    await expect(submitLead(lead)).resolves.toEqual({ ok: true });
    expect(loggedText()).toContain("lead_1");
    expect(loggedText()).toContain("application_error");
    for (const value of personalData) expect(loggedText()).not.toContain(value);
  });

  it("succeeds when stored but Resend throws", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.resendSend.mockRejectedValue(new Error(`Timeout sending for ${lead.email}`));

    await expect(submitLead(lead)).resolves.toEqual({ ok: true });
    for (const value of personalData) expect(loggedText()).not.toContain(value);
  });

  it("fails, and sends no email, when the database write fails", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.leadCreate.mockRejectedValue(
      Object.assign(new Error(`Unique constraint failed for ${lead.email}`), { code: "P2002" }),
    );

    await expect(submitLead(lead)).resolves.toEqual({ ok: false, reason: "failed" });
    expect(mocks.resendSend).not.toHaveBeenCalled();
    expect(loggedText()).toContain("code=P2002");
    for (const value of personalData) expect(loggedText()).not.toContain(value);
  });

  it("stores the lead and names the missing variable when email config is incomplete", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");

    await expect(submitLead(lead)).resolves.toEqual({ ok: true });
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

  it("keeps the stored message when the email fails", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.resendSend.mockResolvedValue({ data: null, error: { name: "rate_limit_exceeded" } });

    await expect(submitContactMessage(contact)).resolves.toEqual({ ok: true });
    expect(loggedText()).toContain("msg_1");
  });

  it("fails when the database write fails, even though email would work", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.contactCreate.mockRejectedValue(new Error("connection refused"));

    await expect(submitContactMessage(contact)).resolves.toEqual({ ok: false, reason: "failed" });
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });
});

describe("subscribeToNewsletter", () => {
  it("logs a failure without the email address", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    mocks.newsletterUpsert.mockRejectedValue(new Error(`Failed for ${lead.email}`));

    await expect(subscribeToNewsletter({ email: lead.email })).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
    expect(loggedText()).not.toContain(lead.email);
  });
});
