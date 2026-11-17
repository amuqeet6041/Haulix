// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailLead } from "@/lib/email/templates";
import { deliverLeadEmails } from "@/services/email.service";
import { carrierInquirySchema, contactSchema } from "@/validations";

const mocks = vi.hoisted(() => ({ resendSend: vi.fn(), leadUpdate: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => true,
  getPrisma: () => ({ lead: { update: mocks.leadUpdate } }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.resendSend };
  },
}));

const API_KEY = "re_super_secret_key";
const TEAM = "team@haulix.test";
const FROM = "HAULIX Logistics <dispatch@haulix.test>";

const carrierLead: EmailLead = {
  type: "CARRIER_INQUIRY",
  id: "lead_carrier",
  createdAt: new Date("2026-11-17T19:58:00Z"),
  sourcePage: "/get-started",
  data: carrierInquirySchema.parse({
    fullName: "Jane Driver",
    email: "jane.driver@example.com",
    phone: "5551234567",
    equipment: "reefer",
    fleetSize: 3,
  }),
};

const contactLead: EmailLead = {
  type: "CONTACT",
  id: "lead_contact",
  createdAt: new Date("2026-11-17T19:58:00Z"),
  sourcePage: "/contact",
  data: contactSchema.parse({
    fullName: "Sam Carrier",
    email: "sam.carrier@example.com",
    inquiryType: "PRICING",
    message: "How does pricing work for one truck?",
  }),
};

interface SentMessage {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

function sent(): SentMessage[] {
  return mocks.resendSend.mock.calls.map((call) => call[0] as SentMessage);
}

function updatedFields(): string[] {
  return mocks.leadUpdate.mock.calls.flatMap((call) =>
    Object.keys((call[0] as { data: Record<string, unknown> }).data),
  );
}

function logged(): string {
  return [...vi.mocked(console.error).mock.calls, ...vi.mocked(console.warn).mock.calls]
    .map((args) => args.map(String).join(" "))
    .join("\n");
}

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", API_KEY);
  vi.stubEnv("FROM_EMAIL", FROM);
  vi.stubEnv("EMAIL_FROM", "");
  vi.stubEnv("CONTACT_EMAIL", TEAM);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.resendSend.mockResolvedValue({ data: { id: "email_1" }, error: null });
  mocks.leadUpdate.mockResolvedValue({ id: "x" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("deliverLeadEmails", () => {
  it("sends the business notification and the customer confirmation", async () => {
    await deliverLeadEmails(carrierLead);

    const [notification, confirmation] = [
      sent().find((m) => m.to === TEAM),
      sent().find((m) => m.to === carrierLead.data.email),
    ];
    expect(notification).toMatchObject({ from: FROM });
    // Notifications set no Reply-To; the body has a mailto reply button instead.
    expect(notification).not.toHaveProperty("replyTo");
    expect(notification?.html).toContain(
      `href="mailto:${encodeURIComponent(carrierLead.data.email)}?subject=`,
    );
    expect(notification?.subject).toBe("New carrier inquiry: Jane Driver (Reefer, 3 trucks)");
    expect(confirmation).toMatchObject({ from: FROM, replyTo: TEAM });
    expect(confirmation?.subject).toBe("We received your carrier inquiry");
  });

  it("records notifiedAt and confirmationSentAt after successful delivery", async () => {
    await deliverLeadEmails(contactLead);

    expect(mocks.leadUpdate).toHaveBeenCalledTimes(2);
    for (const call of mocks.leadUpdate.mock.calls) {
      expect(call[0]).toMatchObject({ where: { id: "lead_contact" } });
    }
    expect(updatedFields().sort()).toEqual(["confirmationSentAt", "notifiedAt"]);
    const value = (mocks.leadUpdate.mock.calls[0]![0] as { data: Record<string, unknown> }).data;
    expect(Object.values(value)[0]).toBeInstanceOf(Date);
  });

  it("marks only the email that Resend accepted", async () => {
    mocks.resendSend.mockImplementation(async (message: SentMessage) =>
      message.to === TEAM
        ? { data: null, error: { name: "validation_error", message: `bad ${TEAM}` } }
        : { data: { id: "ok" }, error: null },
    );

    await deliverLeadEmails(carrierLead);

    expect(updatedFields()).toEqual(["confirmationSentAt"]);
    expect(logged()).toContain("validation_error");
    expect(logged()).toContain("lead_carrier");
  });

  it("marks nothing when Resend throws, and never throws itself", async () => {
    mocks.resendSend.mockRejectedValue(new Error(`socket hang up for ${carrierLead.data.email}`));

    await expect(deliverLeadEmails(carrierLead)).resolves.toBeUndefined();
    expect(mocks.leadUpdate).not.toHaveBeenCalled();
  });

  it("skips everything without configuration and names only the missing variables", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    await deliverLeadEmails(carrierLead);

    expect(mocks.resendSend).not.toHaveBeenCalled();
    expect(mocks.leadUpdate).not.toHaveBeenCalled();
    expect(logged()).toContain("RESEND_API_KEY");
  });

  it("still confirms to the customer when only CONTACT_EMAIL is missing", async () => {
    vi.stubEnv("CONTACT_EMAIL", "");

    await deliverLeadEmails(contactLead);

    expect(sent()).toHaveLength(1);
    expect(sent()[0]?.to).toBe(contactLead.data.email);
    expect(sent()[0]).not.toHaveProperty("replyTo");
    expect(sent()[0]?.text).not.toContain("reply to this email");
    expect(updatedFields()).toEqual(["confirmationSentAt"]);
    expect(logged()).toContain("CONTACT_EMAIL");
  });

  it("logs a failed timestamp update without failing", async () => {
    mocks.leadUpdate.mockRejectedValue(new Error("connection reset"));

    await expect(deliverLeadEmails(contactLead)).resolves.toBeUndefined();
    expect(logged()).toContain("could not record");
  });

  it("never logs secrets or customer addresses", async () => {
    mocks.resendSend.mockResolvedValue({
      data: null,
      error: { name: "invalid_api_key", message: `Key ${API_KEY} rejected for ${TEAM}` },
    });

    await deliverLeadEmails(carrierLead);
    vi.stubEnv("FROM_EMAIL", "");
    await deliverLeadEmails(contactLead);

    const text = logged();
    for (const secret of [API_KEY, TEAM, FROM, carrierLead.data.email, contactLead.data.email]) {
      expect(text).not.toContain(secret);
    }
  });
});
