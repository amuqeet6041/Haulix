/**
 * Fake leads for local admin panel work. Used only by scripts/seed-dev-leads.ts.
 *
 * Every row is obviously fake: emails end in `@example.invalid` (a reserved
 * domain that can never receive mail), phones use the fictional 555-01xx
 * range, and `submissionId` starts with SEED_PREFIX so `--reset` removes only
 * seed rows. The generator is deterministic, so every run makes the same data.
 */
import { equipmentServices } from "@/content/services";
import { inquiryTypeValues } from "@/content/inquiry-types";
import type { InquiryType, LeadStatus, LeadType } from "@/generated/prisma/enums";

export const SEED_PREFIX = "seed-";
export const DEFAULT_SEED_COUNT = 40;

/**
 * Neon endpoints that belong to production. The seed refuses to run against
 * them. Add more with the PRODUCTION_DATABASE_HOSTS env var (comma separated).
 */
export const PRODUCTION_ENDPOINTS = ["ep-restless-unit-bd14k6a6"];

/** Why seeding this database is not allowed, or null when it is safe. */
export function seedTargetProblem(
  databaseUrl: string | undefined,
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (!databaseUrl?.trim()) return "DATABASE_URL is not set.";
  if (env.NODE_ENV === "production" || env.VERCEL || env.VERCEL_ENV) {
    return "Refusing to seed in a production or Vercel environment.";
  }
  let host: string;
  try {
    host = new URL(databaseUrl.trim()).hostname.toLowerCase();
  } catch {
    return "DATABASE_URL is not a valid URL.";
  }
  const denied = [
    ...PRODUCTION_ENDPOINTS,
    ...(env.PRODUCTION_DATABASE_HOSTS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  ];
  if (
    denied.some(
      (entry) => host === entry || host.startsWith(`${entry}.`) || host.startsWith(`${entry}-`),
    )
  ) {
    return "DATABASE_URL points at the production database. Switch .env.local to the dev branch first.";
  }
  return null;
}

export type SeedLead = {
  type: LeadType;
  status: LeadStatus;
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  mcNumber: string | null;
  dotNumber: string | null;
  equipment: string | null;
  fleetSize: number | null;
  preferredLanes: string | null;
  inquiryType: InquiryType | null;
  subject: string | null;
  message: string | null;
  sourcePage: string;
  submissionId: string;
  createdAt: Date;
  contactedAt: Date | null;
};

const FIRST = [
  "Maria",
  "James",
  "Luis",
  "Tanya",
  "Derek",
  "Aisha",
  "Carlos",
  "Nina",
  "Owen",
  "Priya",
  "Marcus",
  "Elena",
  "Tyrone",
  "Grace",
  "Hector",
  "Lena",
  "Victor",
  "Rosa",
  "Andre",
  "Kim",
];
const LAST = [
  "Alvarez",
  "Brooks",
  "Chen",
  "Dawson",
  "Ellis",
  "Foster",
  "Garcia",
  "Hughes",
  "Ibrahim",
  "Jensen",
  "Kowalski",
  "Lopez",
  "Mendez",
  "Nguyen",
  "Okafor",
  "Patel",
  "Reyes",
  "Sullivan",
  "Turner",
  "Walsh",
];
const COMPANY = ["Freight", "Transport", "Logistics", "Hauling", "Carriers", "Trucking"];
const LANES = [
  "Midwest to Southeast",
  "Texas to California",
  "Northeast regional",
  "Atlanta to Chicago",
  "Pacific Northwest",
  "Florida to the Carolinas",
];
const SUBJECTS = [
  "Question about dispatch",
  "Pricing for a small fleet",
  "Partnership idea",
  "Equipment question",
  "Getting started",
];
const MESSAGES = [
  "I run a small fleet and want steady loads. What do you need from me to start?",
  "Can you tell me how your dispatch fee works for owner operators?",
  "Looking for help with paperwork and broker setup packets.",
  "Do you work with reefer carriers in the Midwest?",
  "I would like to talk about a partnership with our brokerage.",
];
const STATUSES: LeadStatus[] = [
  "NEW",
  "NEW",
  "NEW",
  "CONTACTED",
  "CONTACTED",
  "QUALIFIED",
  "ONBOARDED",
  "REJECTED",
  "SPAM",
];
const SOURCES = {
  CARRIER_INQUIRY: ["/get-started", "/", "/services", "/equipment"],
  CONTACT: ["/contact", "/pricing", "/about"],
};

/** Small deterministic PRNG (mulberry32) so seed data is stable between runs. */
function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSeedLeads(count = DEFAULT_SEED_COUNT, now = new Date()): SeedLead[] {
  const random = rng(20261118);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const digits = (length: number) =>
    Array.from({ length }, (_, index) =>
      index === 0 ? 1 + Math.floor(random() * 9) : Math.floor(random() * 10),
    ).join("");

  return Array.from({ length: count }, (_, index) => {
    const first = FIRST[index % FIRST.length]!;
    const last = LAST[(index * 7) % LAST.length]!;
    const type: LeadType = index % 3 === 2 ? "CONTACT" : "CARRIER_INQUIRY";
    const status = pick(STATUSES);
    const createdAt = new Date(now.getTime() - Math.floor(random() * 45 * 24 * 60 + 30) * 60_000);
    const contactedAt =
      status === "NEW" || status === "SPAM"
        ? null
        : new Date(
            Math.min(
              now.getTime(),
              createdAt.getTime() + (2 + Math.floor(random() * 48)) * 3_600_000,
            ),
          );
    const number = String(index + 1).padStart(3, "0");
    const hasCompany = type === "CARRIER_INQUIRY" ? random() < 0.8 : random() < 0.4;
    const isCarrier = type === "CARRIER_INQUIRY";

    return {
      type,
      status,
      fullName: `${first} ${last}`,
      email: `${first}.${last}.${number}@example.invalid`.toLowerCase(),
      phone:
        isCarrier || random() < 0.5
          ? `(555) 01${String(index % 100).padStart(2, "0")}-${digits(3)}`
          : null,
      companyName: hasCompany ? `${last} ${pick(COMPANY)} LLC` : null,
      mcNumber: isCarrier && random() < 0.7 ? digits(6) : null,
      dotNumber: isCarrier && random() < 0.6 ? digits(7) : null,
      equipment: isCarrier || random() < 0.3 ? pick(equipmentServices).slug : null,
      fleetSize: isCarrier ? 1 + Math.floor(random() * 25) : null,
      preferredLanes: isCarrier && random() < 0.6 ? pick(LANES) : null,
      inquiryType: isCarrier ? null : pick(inquiryTypeValues),
      subject: isCarrier ? null : pick(SUBJECTS),
      message: isCarrier && random() < 0.5 ? null : pick(MESSAGES),
      sourcePage: pick(SOURCES[type]),
      submissionId: `${SEED_PREFIX}${number}`,
      createdAt,
      contactedAt,
    };
  });
}
