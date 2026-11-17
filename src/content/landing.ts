/**
 * Copy for the single-page landing page (`src/app/(marketing)/page.tsx`).
 *
 * PLACEHOLDER COPY: every line describes the service in general terms and makes
 * no measurable claims (no statistics, customer counts, ratings, prices or
 * guarantees). Have the HAULIX team review and approve it before launch.
 */

import type { EquipmentSlug } from "@/content/services";

export interface TextItem {
  title: string;
  description: string;
}

export const hero = {
  eyebrow: "US truck dispatch & freight management",
  titleLead: "Dispatch built",
  titleAccent: "for the long haul.",
  description:
    "HAULIX Logistics finds freight, negotiates rates and handles the paperwork for owner-operators and small fleets, so you can keep your focus on the road.",
  primaryCta: { label: "Get Started", href: "/get-started" },
  secondaryCta: { label: "See how it works", href: "#how-it-works" },
  imageAlt: "Black semi-truck driving at night with orange light trails",
  /** Floating cards around the hero image. Illustrative service features, not data. */
  dispatcherCard: {
    label: "Your dispatcher",
    title: "Loads, rates & broker calls",
    description: "One point of contact for the work that keeps you loaded.",
  },
  equipmentCard: {
    label: "Equipment supported",
    caption: "Dry van to hotshot",
  },
  paperworkCard: {
    label: "Paperwork",
    items: ["Rate confirmations", "Broker communication"],
  },
};

/** Credibility highlights. Factual descriptions of the service only. */
export const trustHighlights: TextItem[] = [
  {
    title: "Built for small operations",
    description: "Owner-operators, independent truck owners and small to medium fleets.",
  },
  {
    title: "Seven equipment types",
    description: "Dry van, reefer, flatbed, step deck, power only, box truck and hotshot.",
  },
  {
    title: "Rate negotiation support",
    description: "We talk to brokers on your behalf before a load is booked.",
  },
  {
    title: "Paperwork handled",
    description: "Rate confirmations and broker communication taken off your plate.",
  },
];

export const about = {
  eyebrow: "About HAULIX",
  title: "A dispatch partner that works for the carrier.",
  paragraphs: [
    "HAULIX Logistics is a US truck dispatching company for owner-operators, independent truck owners and small to medium fleets.",
    "We take on the time-consuming side of running a truck: searching for freight, negotiating with brokers and keeping the paperwork in order. You spend your hours driving, and you always know what is booked and why.",
  ],
  pillars: [
    {
      title: "Carrier-first",
      description: "Load details are confirmed with you before you commit.",
    },
    {
      title: "Clear communication",
      description: "Direct contact with your dispatcher from booking to delivery.",
    },
  ] satisfies TextItem[],
  imageAlt: "Dark red semi-truck on an open highway at sunset",
  audienceCard: {
    label: "Who we work with",
    items: ["Owner-operators", "Independent truck owners", "Small & medium fleets"],
  },
};

export const services = {
  eyebrow: "Services",
  title: "Everything behind the wheel, handled.",
  description:
    "Four core services that cover the work between finding a load and getting paid for it.",
  items: [
    {
      title: "Truck Dispatching",
      description:
        "Your dispatcher plans loads around your equipment, preferred lanes and schedule, and keeps you updated along the way.",
    },
    {
      title: "Load Finding",
      description:
        "We search for freight that fits your trailer, lanes and availability, and bring you options before anything is booked.",
    },
    {
      title: "Rate Negotiation",
      description:
        "We negotiate with brokers on your behalf and confirm the details, so loads are booked on terms you have agreed to.",
    },
    {
      title: "Paperwork & Admin Support",
      description:
        "Rate confirmations, carrier setup and the back-and-forth with brokers and shippers, handled for you.",
    },
  ] satisfies TextItem[],
};

export const advantages = {
  eyebrow: "Why HAULIX",
  title: "Dispatch that respects how you run your business.",
  description:
    "You built your operation. We support it with focused dispatch work and straight answers.",
  items: [
    {
      title: "You stay in control",
      description:
        "We bring load options and the details behind them, and confirm them with you before you commit.",
    },
    {
      title: "Equipment-aware dispatch",
      description:
        "Reefer timing, flatbed securement, step deck clearance: freight is matched to what your equipment can actually haul.",
    },
    {
      title: "One point of contact",
      description:
        "Direct communication with your dispatcher, so questions get answered by someone who knows your truck.",
    },
    {
      title: "Less time on admin",
      description:
        "Paperwork and broker communication are handled, giving you back hours you would otherwise spend off the road.",
    },
  ] satisfies TextItem[],
};

export const process = {
  eyebrow: "How it works",
  title: "From first message to first load.",
  description: "A simple, transparent path for carriers who want a dispatcher in their corner.",
};

export type EquipmentCategory = "Enclosed" | "Open deck" | "Tractor only";

/** Trailer category for each equipment type, used to group the equipment grid. */
export const equipmentCategories: Record<EquipmentSlug, EquipmentCategory> = {
  "dry-van": "Enclosed",
  reefer: "Enclosed",
  "box-truck": "Enclosed",
  flatbed: "Open deck",
  "step-deck": "Open deck",
  hotshot: "Open deck",
  "power-only": "Tractor only",
};

export const equipment = {
  eyebrow: "Equipment",
  title: "Dispatch for the truck you drive.",
  description:
    "Supported truck types and trailer categories. Select one to see how dispatch works for that equipment.",
};

export const testimonialsSection = {
  eyebrow: "Carrier stories",
  title: "Real feedback, when it is earned.",
  /** Shown while `content/testimonials.ts` is empty. */
  emptyTitle: "Carrier testimonials are on the way",
  emptyDescription:
    "We only publish feedback from carriers we have worked with, and only with their permission. Check back soon.",
};

export const faqSection = {
  eyebrow: "FAQ",
  title: "Questions carriers ask us.",
  description: "Straight answers about how dispatching with HAULIX works.",
};

export const finalCta = {
  eyebrow: "Get started",
  title: "Ready to keep your truck moving?",
  description:
    "Tell us about your equipment and the lanes you run. Our team will review your details and get back to you.",
  primaryCta: { label: "Get Started", href: "/get-started" },
  secondaryCta: { label: "Contact Us", href: "/contact" },
  imageAlt: "Semi-truck on a highway at night with orange light trails",
};
