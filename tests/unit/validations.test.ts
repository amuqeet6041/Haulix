import { describe, expect, it } from "vitest";

import { contactSchema, leadSchema, newsletterSchema } from "@/validations";

const validLead = {
  fullName: "Jane Driver",
  email: "Jane@Example.com",
  phone: "(555) 123-4567",
  equipment: "dry-van",
  truckCount: 2,
};

describe("leadSchema", () => {
  it("accepts a valid inquiry and normalizes the email", () => {
    const result = leadSchema.safeParse(validLead);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("jane@example.com");
  });

  it("turns empty optional text into undefined", () => {
    const result = leadSchema.safeParse({ ...validLead, companyName: "", mcNumber: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyName).toBeUndefined();
      expect(result.data.mcNumber).toBeUndefined();
    }
  });

  it("rejects an invalid phone number", () => {
    expect(leadSchema.safeParse({ ...validLead, phone: "123" }).success).toBe(false);
  });

  it("rejects an unknown equipment type", () => {
    expect(leadSchema.safeParse({ ...validLead, equipment: "spaceship" }).success).toBe(false);
  });

  it("rejects a non-positive truck count", () => {
    expect(leadSchema.safeParse({ ...validLead, truckCount: 0 }).success).toBe(false);
  });

  it("rejects a malformed MC number", () => {
    expect(leadSchema.safeParse({ ...validLead, mcNumber: "abc" }).success).toBe(false);
  });
});

describe("contactSchema", () => {
  const validMessage = {
    fullName: "Jane Driver",
    email: "jane@example.com",
    subject: "Question",
    message: "I would like to know more.",
  };

  it("accepts a valid message", () => {
    expect(contactSchema.safeParse(validMessage).success).toBe(true);
  });

  it("rejects a message that is too short", () => {
    expect(contactSchema.safeParse({ ...validMessage, message: "Hi" }).success).toBe(false);
  });

  it("keeps the honeypot value so the API route can silently drop bots", () => {
    const result = contactSchema.safeParse({ ...validMessage, website: "http://spam.test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.website).toBe("http://spam.test");
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
