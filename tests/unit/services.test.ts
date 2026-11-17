// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  submitCarrierInquiry,
  submitContactMessage,
  toCarrierInquiryRecord,
  toContactRecord,
  type Scheduler,
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
  leadFindUnique: vi.fn(),
  leadUpdate: vi.fn(),
  newsletterUpsert: vi.fn(),
  resendSend: vi.fn(),
  after: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => Boolean(process.env.DATABASE_URL),
  getPrisma: () => ({
    lead: { create: mocks.leadCreate, findUnique: mocks.leadFindUnique, update: mocks.leadUpdate },
    newsletterSubscriber: { upsert: mocks.newsletterUpsert },
  }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.resendSend };
  },
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  after: mocks.after,
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

const submissionId = "3f1c2b8e-5d4a-4c1e-9a7b-2e6f8d9c0a1b";
const createdAt = new Date("2026-11-17T19:58:00Z");

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

/** Collects background tasks instead of running them after a response. */
function fakeScheduler() {
  const tasks: (() => Promise<void>)[] = [];
  const schedule: Scheduler = (task) => {
    tasks.push(task);
  };
  return { schedule, tasks, runAll: () => Promise.all(tasks.map((task) => task())) };
}

function configureEmail() {
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("FROM_EMAIL", "HAULIX <dispatch@example.com>");
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
  vi.stubEnv("FROM_EMAIL", "");
  vi.stubEnv("EMAIL_FROM", "");
  vi.stubEnv("CONTACT_EMAIL", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.leadCreate.mockResolvedValue({ id: "lead_1", createdAt });
  mocks.leadUpdate.mockResolvedValue({ id: "lead_1" });
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
    for (const record of [inquiryRecord, contactRecord]) {
      expect(record.sourcePage).toBeNull();
      for (const field of serverManagedFields.filter((f) => f !== "sourcePage")) {
        expect(record).not.toHaveProperty(field);
      }
    }
  });

  it("adds server-derived source page and submission id", () => {
    const meta = { sourcePage: "/contact", submissionId };
    expect(toContactRecord(contact, meta)).toMatchObject(meta);
    expect(toCarrierInquiryRecord(inquiry, meta)).toMatchObject(meta);
  });
});

describe("submitting leads", () => {
  it("is not_configured without a database and schedules nothing", async () => {
    configureEmail();
    const scheduler = fakeScheduler();
    await expect(submitCarrierInquiry(inquiry, {}, scheduler)).resolves.toEqual({
      ok: false,
      reason: "not_configured",
    });
    expect(scheduler.tasks).toHaveLength(0);
  });

  it("stores first, responds ok, and only schedules the emails", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    const scheduler = fakeScheduler();

    await expect(
      submitCarrierInquiry(inquiry, { sourcePage: "/get-started", submissionId }, scheduler),
    ).resolves.toEqual({ ok: true });

    expect(storedRecord()).toMatchObject({ submissionId, sourcePage: "/get-started" });
    expect(scheduler.tasks).toHaveLength(1);
    expect(mocks.resendSend).not.toHaveBeenCalled();

    await scheduler.runAll();
    expect(mocks.resendSend).toHaveBeenCalledTimes(2);
  });

  it("uses Next.js after() by default", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    await submitContactMessage(contact);
    expect(mocks.after).toHaveBeenCalledOnce();
    expect(mocks.after.mock.calls[0]?.[0]).toBeTypeOf("function");
  });

  it("passes the stored id, time and source page to the email task", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    const scheduler = fakeScheduler();
    await submitContactMessage(contact, { sourcePage: "/contact" }, scheduler);
    await scheduler.runAll();

    const notification = mocks.resendSend.mock.calls
      .map((call) => call[0] as { to: string; text: string })
      .find((message) => message.to === "team@example.com");
    expect(notification?.text).toContain("Lead ID: lead_1");
    expect(notification?.text).toContain("Source page: /contact");
    expect(notification?.text).toContain("Nov 17, 2026");
  });

  it("keeps a stored lead successful when both emails fail", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.resendSend.mockRejectedValue(new Error(`Timeout for ${inquiry.email}`));
    const scheduler = fakeScheduler();

    await expect(submitCarrierInquiry(inquiry, {}, scheduler)).resolves.toEqual({ ok: true });
    await expect(scheduler.runAll()).resolves.toBeDefined();
    expect(mocks.leadUpdate).not.toHaveBeenCalled();
    expect(loggedText()).not.toContain(inquiry.email);
  });

  it("fails, and schedules no email, when the database write fails", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.leadCreate.mockRejectedValue(
      Object.assign(new Error(`Insert failed for ${inquiry.email}`), { code: "P1001" }),
    );
    const scheduler = fakeScheduler();

    await expect(submitContactMessage(contact, {}, scheduler)).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
    expect(scheduler.tasks).toHaveLength(0);
    expect(loggedText()).toContain("code=P1001");
    expect(loggedText()).not.toContain(inquiry.email);
  });
});

describe("duplicate submissions", () => {
  it("returns ok without scheduling a second round of emails", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    configureEmail();
    mocks.leadCreate.mockRejectedValue(Object.assign(new Error("Unique"), { code: "P2002" }));
    mocks.leadFindUnique.mockResolvedValue({ id: "lead_existing" });
    const scheduler = fakeScheduler();

    await expect(submitContactMessage(contact, { submissionId }, scheduler)).resolves.toEqual({
      ok: true,
    });
    expect(mocks.leadFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { submissionId } }),
    );
    expect(scheduler.tasks).toHaveLength(0);
    expect(mocks.resendSend).not.toHaveBeenCalled();
    expect(loggedText()).toContain("Duplicate submission");
  });

  it("still fails on a unique violation that is not a known submission", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    mocks.leadCreate.mockRejectedValue(Object.assign(new Error("Unique"), { code: "P2002" }));
    mocks.leadFindUnique.mockResolvedValue(null);
    const scheduler = fakeScheduler();

    await expect(submitCarrierInquiry(inquiry, { submissionId }, scheduler)).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
    expect(scheduler.tasks).toHaveLength(0);
  });

  it("does not look up duplicates when no submission id was sent", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    mocks.leadCreate.mockRejectedValue(Object.assign(new Error("Unique"), { code: "P2002" }));

    await expect(submitCarrierInquiry(inquiry, {}, fakeScheduler())).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
    expect(mocks.leadFindUnique).not.toHaveBeenCalled();
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
