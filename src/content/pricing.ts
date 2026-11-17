/**
 * Pricing tiers.
 *
 * No prices have been provided yet, so every tier shows a neutral label.
 * Set `priceLabel` (and optionally `priceNote`) once the business decides.
 * PLACEHOLDER COPY: confirm feature lists with the HAULIX team.
 */

export interface PricingPlan {
  id: string;
  name: string;
  audience: string;
  priceLabel: string;
  priceNote?: string;
  features: string[];
  highlighted?: boolean;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: "owner-operator",
    name: "Owner-Operator",
    audience: "For single-truck owners",
    priceLabel: "Pricing coming soon",
    priceNote: "Contact us to discuss",
    features: ["Freight search", "Rate negotiation support", "Paperwork support"],
  },
  {
    id: "small-fleet",
    name: "Small Fleet",
    audience: "For growing carriers",
    priceLabel: "Pricing coming soon",
    priceNote: "Contact us to discuss",
    features: ["Everything in Owner-Operator", "Support for multiple trucks", "Lane planning"],
    highlighted: true,
  },
  {
    id: "fleet",
    name: "Fleet",
    audience: "For larger operations",
    priceLabel: "Custom",
    priceNote: "Tailored to your fleet",
    features: ["Everything in Small Fleet", "Fleet-level coordination", "Custom arrangements"],
  },
];
