import { equipmentServices } from "@/content/services";

export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

/**
 * Anchor ids of the single-page landing sections (used by `components/home/*`
 * and in-page links on the homepage).
 */
export const landingSectionIds = {
  home: "top",
  about: "about",
  services: "services",
  howItWorks: "how-it-works",
  equipment: "equipment",
  faq: "faq",
  contact: "contact",
} as const;

/** Primary navigation. Each item links to its own public page. */
export const mainNav: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Equipment", href: "/equipment" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

export const getStartedLink: NavLink = { label: "Get Started", href: "/get-started" };

export const footerNav = {
  company: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ],
  services: [
    { label: "Dispatch Services", href: "/services" },
    { label: "Equipment", href: "/equipment" },
    { label: "Pricing", href: "/pricing" },
    { label: "Get Started", href: "/get-started" },
    { label: "Resources", href: "/resources" },
  ],
  equipment: equipmentServices.map((service) => ({
    label: service.name.replace(" Dispatch", ""),
    href: `/services/${service.slug}`,
  })),
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms & Conditions", href: "/terms" },
  ],
} satisfies Record<string, NavLink[]>;
