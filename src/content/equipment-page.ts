/**
 * Copy for /equipment. The equipment list itself comes from `content/services.ts`
 * and the trailer categories from `content/landing.ts`, so the seven types stay
 * in sync with the homepage, navigation and detail pages.
 *
 * PLACEHOLDER COPY: have the HAULIX team review it before launch.
 */

import type { EquipmentCategory } from "@/content/landing";

export const equipmentPage = {
  header: {
    eyebrow: "Equipment",
    title: "Dispatch for seven equipment types",
    description:
      "Every trailer comes with its own freight, rules and timing. Find yours below and see how we handle dispatch for it.",
  },
  /** Display order and intro copy for each trailer category. */
  categories: [
    {
      id: "enclosed",
      category: "Enclosed",
      title: "Enclosed trailers and trucks",
      description:
        "Freight that rides inside and out of the weather, from palletized dry goods to temperature controlled loads.",
    },
    {
      id: "open-deck",
      category: "Open deck",
      title: "Open deck",
      description:
        "Loads that need securement, clearance checks and careful planning before the truck ever rolls.",
    },
    {
      id: "tractor-only",
      category: "Tractor only",
      title: "Tractor only",
      description: "Runs where you bring the power and pull a trailer someone else owns.",
    },
  ] satisfies { id: string; category: EquipmentCategory; title: string; description: string }[],
  notListed: {
    title: "Running something else?",
    description:
      "Tell us about your truck and trailer. We'll let you know honestly whether we're a good fit.",
    cta: { label: "Tell us about your truck", href: "/get-started" },
  },
  cta: {
    title: "Find freight that fits your truck.",
    description:
      "Tell us what you run and where you like to go. Our team will review your details and reach out.",
  },
};
