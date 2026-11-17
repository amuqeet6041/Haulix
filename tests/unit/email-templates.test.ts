// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  businessNotificationEmail,
  customerConfirmationEmail,
  escapeHtml,
  formatSubmittedAt,
  sanitizeSubject,
  type EmailLead,
} from "@/lib/email/templates";
import { carrierInquirySchema, contactSchema } from "@/validations";

const createdAt = new Date("2026-11-17T19:58:00Z");

const fullCarrier: EmailLead = {
  type: "CARRIER_INQUIRY",
  id: "lead_full",
  createdAt,
  sourcePage: "/get-started",
  data: carrierInquirySchema.parse({
    fullName: "Jane Driver",
    email: "jane@example.com",
    phone: "(555) 123-4567",
    companyName: "Driver Freight LLC",
    mcNumber: "123456",
    dotNumber: "7654321",
    equipment: "flatbed",
    fleetSize: 1,
    preferredLanes: "Texas to Georgia",
    message: "Looking for steady loads.",
  }),
};

const minimalCarrier: EmailLead = {
  type: "CARRIER_INQUIRY",
  id: "lead_min",
  createdAt,
  sourcePage: null,
  data: carrierInquirySchema.parse({
    fullName: "Jane Driver",
    email: "jane@example.com",
    phone: "5551234567",
    equipment: "dry-van",
    fleetSize: 4,
  }),
};

const fullContact: EmailLead = {
  type: "CONTACT",
  id: "lead_contact",
  createdAt,
  sourcePage: "/contact",
  data: contactSchema.parse({
    fullName: "Sam Carrier",
    email: "sam@example.com",
    phone: "555-000-1111",
    companyName: "Sam Trucking",
    inquiryType: "PARTNERSHIP",
    subject: "Working together",
    equipment: "hotshot",
    fleetSize: 6,
    message: "We would like to talk about a partnership.",
  }),
};

const minimalContact: EmailLead = {
  type: "CONTACT",
  id: "lead_contact_min",
  createdAt,
  sourcePage: null,
  data: contactSchema.parse({
    fullName: "Sam Carrier",
    email: "sam@example.com",
    inquiryType: "GENERAL",
    message: "Just a quick question for you.",
  }),
};

describe("business notifications", () => {
  it("carrier: includes every provided field, timestamp, source page and lead id", () => {
    const email = businessNotificationEmail(fullCarrier);
    expect(email.subject).toBe("New carrier inquiry: Jane Driver (Flatbed, 1 truck)");
    for (const expected of [
      "Full name: Jane Driver",
      "Email: jane@example.com",
      "Phone: (555) 123-4567",
      "Company: Driver Freight LLC",
      "MC number: 123456",
      "DOT number: 7654321",
      "Equipment: Flatbed",
      "Fleet size: 1 truck",
      "Preferred lanes: Texas to Georgia",
      "Looking for steady loads.",
      "Submitted: Nov 17, 2026, 7:58 PM UTC",
      "Source page: /get-started",
      "Lead ID: lead_full",
    ]) {
      expect(email.text).toContain(expected);
    }
    expect(email.html).toContain("Driver Freight LLC");
    expect(email.html).toContain("lead_full");
  });

  it("carrier: omits optional fields that were not provided", () => {
    const email = businessNotificationEmail(minimalCarrier);
    for (const label of [
      "Company",
      "MC number",
      "DOT number",
      "Preferred lanes",
      "Message",
      "Source page",
    ]) {
      expect(email.text).not.toContain(`${label}:`);
      expect(email.html).not.toContain(`>${label}<`);
    }
    expect(email.text).toContain("Fleet size: 4 trucks");
  });

  it("contact: includes inquiry type, subject, equipment and fleet size when given", () => {
    const email = businessNotificationEmail(fullContact);
    expect(email.subject).toBe("New contact message: Partnership from Sam Carrier");
    for (const expected of [
      "Inquiry type: Partnership",
      "Subject: Working together",
      "Company: Sam Trucking",
      "Equipment: Hotshot",
      "Fleet size: 6 trucks",
      "We would like to talk about a partnership.",
      "Lead ID: lead_contact",
    ]) {
      expect(email.text).toContain(expected);
    }
  });

  it("contact: omits optional fields that were not provided", () => {
    const email = businessNotificationEmail(minimalContact);
    for (const label of ["Phone", "Company", "Subject", "Equipment", "Fleet size", "Source page"]) {
      expect(email.text).not.toContain(`${label}:`);
    }
    expect(email.text).toContain("Inquiry type: General question");
  });

  it("offers a one-click reply to the customer instead of a Reply-To header", () => {
    for (const lead of [fullCarrier, fullContact]) {
      const email = businessNotificationEmail(lead);
      expect(email.html).toContain(`href="mailto:${encodeURIComponent(lead.data.email)}?subject=`);
      expect(email.html).toContain(`Reply to ${lead.data.fullName.split(" ")[0]}`);
      expect(email.text).toContain(
        `Reply to ${lead.data.fullName.split(" ")[0]}: ${lead.data.email}`,
      );
    }
  });

  it("escapes the reply link", () => {
    const lead = {
      ...minimalContact,
      data: { ...minimalContact.data, fullName: `Eve "><script>` },
    } as EmailLead;
    const { html } = businessNotificationEmail(lead);
    expect(html).not.toContain("<script>");
    expect(html).toContain("Reply to Eve");
  });

  it("subjects distinguish the two lead types", () => {
    expect(businessNotificationEmail(minimalCarrier).subject).toMatch(/^New carrier inquiry/);
    expect(businessNotificationEmail(minimalContact).subject).toMatch(/^New contact message/);
  });
});

describe("customer confirmations", () => {
  it("carrier: confirms receipt with a summary and no internal data", () => {
    const email = customerConfirmationEmail(fullCarrier, { canReply: true });
    expect(email.subject).toBe("We received your carrier inquiry");
    expect(email.text).toContain("Hi Jane,");
    expect(email.text).toContain("Equipment: Flatbed");
    expect(email.text).toContain("reply to this email");
    for (const internal of ["lead_full", "Lead ID", "/get-started", "Source page", "UTC"]) {
      expect(email.text).not.toContain(internal);
      expect(email.html).not.toContain(internal);
    }
  });

  it("contact: confirms the message and repeats it back", () => {
    const email = customerConfirmationEmail(fullContact, { canReply: true });
    expect(email.subject).toBe("We received your message");
    expect(email.text).toContain("Hi Sam,");
    expect(email.text).toContain("Topic: Partnership");
    expect(email.text).toContain("We would like to talk about a partnership.");
    expect(email.text).not.toContain("lead_contact");
  });

  it("promises no response time and avoids dashes in copy", () => {
    for (const lead of [fullCarrier, fullContact]) {
      const { text } = customerConfirmationEmail(lead, { canReply: false });
      expect(text).not.toMatch(/\b(hours?|minutes?|business days?|within|guarantee)\b/i);
      expect(text).not.toMatch(/[–—]/);
    }
  });

  it("only offers replying when replies reach the team", () => {
    expect(customerConfirmationEmail(minimalContact, { canReply: false }).text).not.toContain(
      "reply to this email",
    );
  });

  it("is responsive, email-safe HTML with a plain-text version", () => {
    const email = customerConfirmationEmail(minimalCarrier, { canReply: true });
    expect(email.html).toContain('name="viewport"');
    expect(email.html).toContain("max-width:600px");
    expect(email.html).toContain("#E86416");
    expect(email.html).not.toMatch(/<script|<link|var\(--/);
    expect(email.text.length).toBeGreaterThan(50);
  });
});

describe("safety", () => {
  it("escapes user input in HTML", () => {
    const lead: EmailLead = {
      ...minimalContact,
      data: {
        ...minimalContact.data,
        fullName: "<img src=x onerror=alert(1)>",
        message: "<b>hi</b>",
      },
    } as EmailLead;
    for (const email of [
      businessNotificationEmail(lead),
      customerConfirmationEmail(lead, { canReply: true }),
    ]) {
      expect(email.html).not.toContain("<img src=x");
      expect(email.html).not.toContain("<b>hi</b>");
    }
    expect(escapeHtml(`"'<>&`)).toBe("&quot;&#39;&lt;&gt;&amp;");
  });

  it("keeps subjects on one line", () => {
    expect(sanitizeSubject("Hello\r\nBcc: someone@example.com")).toBe(
      "Hello Bcc: someone@example.com",
    );
    expect(sanitizeSubject("x".repeat(400))).toHaveLength(150);
  });

  it("formats submission time in UTC", () => {
    expect(formatSubmittedAt(createdAt)).toBe("Nov 17, 2026, 7:58 PM UTC");
  });
});
