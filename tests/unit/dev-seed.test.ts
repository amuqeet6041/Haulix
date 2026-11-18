// @vitest-environment node
import { describe, expect, it } from "vitest";

import { inquiryTypeValues } from "@/content/inquiry-types";
import { equipmentSlugs } from "@/content/services";
import {
  buildSeedLeads,
  PRODUCTION_ENDPOINTS,
  SEED_PREFIX,
  seedTargetProblem,
} from "@/lib/dev-seed";
import { carrierInquirySchema, contactSchema } from "@/validations";

const DEV_URL =
  "postgresql://user:pw@ep-dev-branch-123456-pooler.c-8.us-east-2.aws.neon.tech/neondb";
const prodUrl = (suffix = "-pooler") =>
  `postgresql://user:pw@${PRODUCTION_ENDPOINTS[0]}${suffix}.c-8.us-east-2.aws.neon.tech/neondb`;

describe("seedTargetProblem (production guard)", () => {
  it("allows a dev branch in a local environment", () => {
    expect(seedTargetProblem(DEV_URL, { NODE_ENV: "development" })).toBeNull();
  });

  it("refuses the production endpoint, pooled or direct", () => {
    expect(seedTargetProblem(prodUrl(), {})).toMatch(/production/);
    expect(seedTargetProblem(prodUrl(""), {})).toMatch(/production/);
  });

  it("refuses hosts listed in PRODUCTION_DATABASE_HOSTS", () => {
    expect(
      seedTargetProblem(DEV_URL, { PRODUCTION_DATABASE_HOSTS: "other, ep-dev-branch-123456" }),
    ).toMatch(/production/);
  });

  it("refuses production and Vercel environments, and missing or invalid URLs", () => {
    expect(seedTargetProblem(DEV_URL, { NODE_ENV: "production" })).not.toBeNull();
    expect(seedTargetProblem(DEV_URL, { VERCEL: "1" })).not.toBeNull();
    expect(seedTargetProblem(undefined, {})).not.toBeNull();
    expect(seedTargetProblem("not a url", {})).not.toBeNull();
  });
});

describe("buildSeedLeads", () => {
  const now = new Date("2026-11-18T12:00:00Z");
  const leads = buildSeedLeads(40, now);

  it("is deterministic", () => {
    expect(buildSeedLeads(40, now)).toEqual(leads);
  });

  it("makes clearly fake, unique rows that --reset can find", () => {
    expect(new Set(leads.map((lead) => lead.submissionId)).size).toBe(40);
    expect(new Set(leads.map((lead) => lead.email)).size).toBe(40);
    for (const lead of leads) {
      expect(lead.submissionId.startsWith(SEED_PREFIX)).toBe(true);
      expect(lead.email.endsWith("@example.invalid")).toBe(true);
      if (lead.phone) expect(lead.phone).toMatch(/^\(555\) 01\d\d-\d{3}$/);
      expect(lead.createdAt.getTime()).toBeLessThan(now.getTime());
    }
  });

  it("covers both lead types and several statuses", () => {
    expect(new Set(leads.map((lead) => lead.type))).toEqual(
      new Set(["CARRIER_INQUIRY", "CONTACT"]),
    );
    expect(new Set(leads.map((lead) => lead.status)).size).toBeGreaterThanOrEqual(4);
  });

  it("produces rows the public form schemas would accept (apart from the reserved email domain)", () => {
    for (const lead of leads) {
      const input = {
        ...Object.fromEntries(Object.entries(lead).filter(([, value]) => value !== null)),
        email: lead.email.replace("@example.invalid", "@example.com"),
      };
      const schema = lead.type === "CONTACT" ? contactSchema : carrierInquirySchema;
      expect(schema.safeParse(input).success).toBe(true);
      if (lead.equipment) expect(equipmentSlugs).toContain(lead.equipment);
      if (lead.inquiryType) expect(inquiryTypeValues).toContain(lead.inquiryType);
    }
  });
});
