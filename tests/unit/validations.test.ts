import { describe, expect, it } from "vitest";

import { inquiryTypeValues } from "@/content/inquiry-types";
import { InquiryType, LeadStatus, LeadType } from "@/generated/prisma/enums";
import { leadLimits } from "@/lib/validations/primitives";
import { carrierInquirySchema, contactSchema, leadTypes, newsletterSchema } from "@/validations";

/** Field names that schema parsing returned errors for. */
function errorFields(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return (result.error?.issues ?? []).map((issue) => issue.path.join("."));
}

const validInquiry = {
  fullName: "Jane Driver",
  email: "Jane@Example.com",
  phone: "(555) 123-4567",
  equipment: "dry-van",
  fleetSize: 2,
};

const validContact = {
  fullName: "Jane Driver",
  email: "jane@example.com",
  inquiryType: "GENERAL",
  message: "I would like to know more.",
};

/** Server-managed columns a client might try to set. */
const serverManaged = {
  type: "CONTACT",
  status: "QUALIFIED",
  sourcePage: "/admin",
  submissionId: "client-chosen",
  ipHash: "spoofed",
  userAgent: "x",
  notifiedAt: "2000-01-01",
  confirmationSentAt: "2000-01-01",
  createdAt: "2000-01-01",
  updatedAt: "2000-01-01",
  notes: "VIP",
  contactedAt: "2000-01-01",
};

describe("carrierInquirySchema (CARRIER_INQUIRY)", () => {
  it("accepts a valid inquiry and normalizes the email", () => {
    const result = carrierInquirySchema.safeParse(validInquiry);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("jane@example.com");
  });

  it("accepts every optional field when provided", () => {
    const result = carrierInquirySchema.safeParse({
      ...validInquiry,
      companyName: "Driver Freight LLC",
      mcNumber: "123456",
      dotNumber: "7654321",
      preferredLanes: "Midwest to Southeast",
      message: "Looking for steady loads.",
    });
    expect(result.success).toBe(true);
  });

  it("turns empty optional text into undefined", () => {
    const result = carrierInquirySchema.safeParse({
      ...validInquiry,
      companyName: "",
      mcNumber: "",
      message: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyName).toBeUndefined();
      expect(result.data.mcNumber).toBeUndefined();
      expect(result.data.message).toBeUndefined();
    }
  });

  it("requires full name, email, phone, equipment and fleet size", () => {
    const result = carrierInquirySchema.safeParse({});
    expect(errorFields(result).sort()).toEqual(
      ["email", "equipment", "fleetSize", "fullName", "phone"].sort(),
    );
  });

  it("rejects an invalid phone number", () => {
    expect(carrierInquirySchema.safeParse({ ...validInquiry, phone: "123" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(carrierInquirySchema.safeParse({ ...validInquiry, email: "nope" }).success).toBe(false);
  });

  it("rejects an unknown equipment type", () => {
    expect(
      carrierInquirySchema.safeParse({ ...validInquiry, equipment: "spaceship" }).success,
    ).toBe(false);
  });

  it.each([0, -1, 2.5, leadLimits.fleetSize + 1, Number.NaN])(
    "rejects a fleet size of %s",
    (fleetSize) => {
      expect(carrierInquirySchema.safeParse({ ...validInquiry, fleetSize }).success).toBe(false);
    },
  );

  it("accepts the largest allowed fleet size", () => {
    expect(
      carrierInquirySchema.safeParse({ ...validInquiry, fleetSize: leadLimits.fleetSize }).success,
    ).toBe(true);
  });

  it("rejects a malformed MC number", () => {
    expect(carrierInquirySchema.safeParse({ ...validInquiry, mcNumber: "abc" }).success).toBe(
      false,
    );
  });

  it("strips server-managed fields supplied by the client", () => {
    const result = carrierInquirySchema.safeParse({ ...validInquiry, ...serverManaged });
    expect(result.success).toBe(true);
    if (result.success) {
      for (const field of Object.keys(serverManaged)) expect(result.data).not.toHaveProperty(field);
    }
  });
});

describe("contactSchema (CONTACT)", () => {
  it("accepts a valid message with only the required fields", () => {
    expect(contactSchema.safeParse(validContact).success).toBe(true);
  });

  it("accepts the optional phone, company, subject, equipment and fleet size", () => {
    const result = contactSchema.safeParse({
      ...validContact,
      phone: "555-123-4567",
      companyName: "Driver Freight LLC",
      subject: "Question",
      equipment: "reefer",
      fleetSize: 4,
    });
    expect(result.success).toBe(true);
  });

  it("treats empty optional controls as not provided", () => {
    const result = contactSchema.safeParse({
      ...validContact,
      phone: "",
      subject: "",
      equipment: "",
      fleetSize: Number.NaN,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
      expect(result.data.subject).toBeUndefined();
      expect(result.data.equipment).toBeUndefined();
      expect(result.data.fleetSize).toBeUndefined();
    }
  });

  it("requires full name, email, inquiry type and message", () => {
    const result = contactSchema.safeParse({});
    expect(errorFields(result).sort()).toEqual(
      ["email", "fullName", "inquiryType", "message"].sort(),
    );
  });

  it("rejects a message that is too short", () => {
    expect(contactSchema.safeParse({ ...validContact, message: "Hi" }).success).toBe(false);
  });

  it("rejects an unknown inquiry type", () => {
    expect(contactSchema.safeParse({ ...validContact, inquiryType: "LOANS" }).success).toBe(false);
  });

  it("rejects an invalid optional phone, equipment or fleet size", () => {
    expect(contactSchema.safeParse({ ...validContact, phone: "12" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...validContact, equipment: "spaceship" }).success).toBe(
      false,
    );
    expect(contactSchema.safeParse({ ...validContact, fleetSize: 0 }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(contactSchema.safeParse({ ...validContact, email: "nope" }).success).toBe(false);
  });

  it("strips server-managed fields supplied by the client", () => {
    const result = contactSchema.safeParse({ ...validContact, ...serverManaged });
    expect(result.success).toBe(true);
    if (result.success) {
      for (const field of Object.keys(serverManaged)) expect(result.data).not.toHaveProperty(field);
    }
  });

  it("keeps the honeypot value so the API route can silently drop bots", () => {
    const result = contactSchema.safeParse({ ...validContact, website: "http://spam.test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.website).toBe("http://spam.test");
  });
});

describe("Zod and Prisma enums stay in sync", () => {
  it("lead types match the Prisma LeadType enum", () => {
    expect([...leadTypes].sort()).toEqual(Object.values(LeadType).sort());
  });

  it("inquiry types match the Prisma InquiryType enum", () => {
    expect([...inquiryTypeValues].sort()).toEqual(Object.values(InquiryType).sort());
  });

  it("LeadStatus starts at NEW and includes SPAM", () => {
    expect(Object.values(LeadStatus)).toEqual([
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "ONBOARDED",
      "REJECTED",
      "SPAM",
    ]);
  });
});

describe("newsletterSchema", () => {
  it("accepts a valid email", () => {
    expect(newsletterSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(newsletterSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});
