/**
 * Pricing page content.
 *
 * No prices have been set yet, so the page uses a request-a-quote approach:
 * no amounts, percentages, named packages or guarantees. The quote profiles
 * below describe who we quote for and what we ask about, not what is included.
 * Set `priceLabel` (and optionally `priceNote`) once real pricing is decided.
 * PLACEHOLDER COPY: have the HAULIX team review it before launch.
 */

import type { TextItem } from "@/content/landing";

export interface PricingPlan {
  id: string;
  name: string;
  audience: string;
  priceLabel: string;
  priceNote?: string;
  /** Heading shown above `features`, e.g. "What we'll ask about". */
  featuresLabel?: string;
  features: string[];
  highlighted?: boolean;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: "single-truck",
    name: "Single truck",
    audience: "For owner-operators running one truck",
    priceLabel: "Quote on request",
    priceNote: "Based on your equipment and lanes",
    featuresLabel: "We'll ask about",
    features: ["Your equipment type", "The lanes you like to run", "How often you want to be home"],
  },
  {
    id: "small-fleet",
    name: "Small fleet",
    audience: "For carriers running a few trucks",
    priceLabel: "Quote on request",
    priceNote: "Based on your trucks and drivers",
    featuresLabel: "We'll ask about",
    features: [
      "How many trucks and drivers you have",
      "The mix of equipment you run",
      "How you split lanes across trucks",
    ],
  },
  {
    id: "larger-fleet",
    name: "Larger fleet",
    audience: "For growing operations",
    priceLabel: "Quote on request",
    priceNote: "Worked out with your team",
    featuresLabel: "We'll ask about",
    features: [
      "Your fleet size and equipment",
      "Who handles dispatch today",
      "The support you want from us",
    ],
  },
];

export const pricingPage = {
  header: {
    eyebrow: "Pricing",
    title: "Get a quote for your operation",
    description:
      "We have not published set prices yet. Every carrier runs differently, so we put together a quote once we understand your truck and the freight you haul.",
  },
  approach: {
    eyebrow: "Our approach",
    title: "A quote that starts with your business",
    paragraphs: [
      "A single reefer running regional lanes needs something different than a five-truck flatbed fleet. Instead of forcing you into a package, we learn how you operate first.",
      "We walk you through the quote, explain what it covers and answer your questions before you agree to anything.",
    ],
  },
  factors: {
    eyebrow: "What shapes your quote",
    title: "What we look at",
    items: [
      {
        title: "Your equipment",
        description: "Trailer type and what you are set up to haul.",
      },
      {
        title: "Number of trucks",
        description: "One truck or several, and how many drivers you have.",
      },
      {
        title: "Lanes and freight",
        description: "Where you run and the kind of loads you prefer.",
      },
      {
        title: "The support you need",
        description: "How much of the dispatch and paperwork you want us to handle.",
      },
    ] satisfies TextItem[],
  },
  profiles: {
    eyebrow: "Who we quote for",
    title: "One truck or a whole fleet",
    description: "Pick the description closest to you. Either way, the next step is the same.",
    ctaLabel: "Request a quote",
  },
  steps: {
    eyebrow: "Getting a quote",
    title: "How it works",
    items: [
      {
        title: "Send your details",
        description: "Tell us about your equipment, truck count and lanes on the Get Started form.",
      },
      {
        title: "Talk with our team",
        description: "We reach out to learn more about your operation and what you need.",
      },
      {
        title: "Review your quote",
        description: "We go over the numbers with you and answer your questions. Then you decide.",
      },
    ] satisfies TextItem[],
  },
  cta: {
    title: "Find out what dispatch would cost you.",
    description:
      "Share a few details about your truck and lanes. Our team will reach out to talk through pricing with you.",
    primary: { label: "Request a quote", href: "/get-started" },
  },
};
