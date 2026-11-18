import type { LeadStatus, LeadType } from "@/generated/prisma/enums";

/**
 * Admin-facing labels and badge styling for lead statuses and types.
 *
 * The order here is the order filters, dropdowns and dashboard counts use.
 * Values must match the Prisma `LeadStatus` and `LeadType` enums (a unit test
 * checks this). Badge tones use only palette colors and their alpha tints.
 */

export type BadgeTone = "accent" | "soft" | "positive" | "strong" | "muted" | "danger";

export const leadStatuses = [
  {
    value: "NEW",
    label: "New",
    description: "Just arrived. Nobody has reached out yet.",
    tone: "accent",
  },
  {
    value: "CONTACTED",
    label: "Contacted",
    description: "We reached out and are waiting on a reply.",
    tone: "soft",
  },
  {
    value: "QUALIFIED",
    label: "Qualified",
    description: "A good fit. Working toward onboarding.",
    tone: "positive",
  },
  {
    value: "ONBOARDED",
    label: "Onboarded",
    description: "Signed up and being dispatched.",
    tone: "strong",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    description: "Not a fit right now.",
    tone: "muted",
  },
  {
    value: "SPAM",
    label: "Spam",
    description: "Junk or abusive submission.",
    tone: "danger",
  },
] as const satisfies readonly {
  value: LeadStatus;
  label: string;
  description: string;
  tone: BadgeTone;
}[];

export type LeadStatusValue = (typeof leadStatuses)[number]["value"];

export const leadStatusValues = leadStatuses.map((status) => status.value) as [
  LeadStatusValue,
  ...LeadStatusValue[],
];

export const leadTypeOptions = [
  {
    value: "CARRIER_INQUIRY",
    label: "Carrier inquiry",
    pluralLabel: "Carrier inquiries",
    shortLabel: "Carrier",
  },
  {
    value: "CONTACT",
    label: "Contact message",
    pluralLabel: "Contact messages",
    shortLabel: "Contact",
  },
] as const satisfies readonly {
  value: LeadType;
  label: string;
  pluralLabel: string;
  shortLabel: string;
}[];

export type LeadTypeOptionValue = (typeof leadTypeOptions)[number]["value"];

export const leadTypeValues = leadTypeOptions.map((type) => type.value) as [
  LeadTypeOptionValue,
  ...LeadTypeOptionValue[],
];

/** Tailwind classes for each badge tone (palette colors and alpha tints only). */
export const badgeToneClasses: Record<BadgeTone, string> = {
  accent: "bg-orange/15 text-orange border-orange/30",
  soft: "bg-orange-soft/15 text-orange-soft border-orange-soft/30",
  positive: "bg-cream/10 text-cream border-cream/25",
  strong: "bg-cream text-ink border-cream",
  muted: "bg-gray/10 text-gray/80 border-gray/20",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
};

export function leadStatusMeta(value: string) {
  return leadStatuses.find((status) => status.value === value);
}

export function leadStatusLabel(value: string): string {
  return leadStatusMeta(value)?.label ?? value;
}

export function leadStatusTone(value: string): BadgeTone {
  return leadStatusMeta(value)?.tone ?? "muted";
}

export function leadTypeLabel(value: string, { short = false } = {}): string {
  const type = leadTypeOptions.find((option) => option.value === value);
  if (!type) return value;
  return short ? type.shortLabel : type.label;
}
