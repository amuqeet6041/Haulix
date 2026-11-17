import { equipmentServices } from "@/content/services";

export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

/**
 * Primary navigation. Items point at sections of the single-page landing page
 * (see `landingSectionIds`), so they also work from inner pages: `/#services`
 * navigates home and scrolls to the section.
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

export const mainNav: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: `/#${landingSectionIds.about}` },
  { label: "Services", href: `/#${landingSectionIds.services}` },
  { label: "How It Works", href: `/#${landingSectionIds.howItWorks}` },
  { label: "Contact", href: `/#${landingSectionIds.contact}` },
];

export const getStartedLink: NavLink = { label: "Get Started", href: "/get-started" };

export const footerNav = {
  company: [
    { label: "Home", href: "/" },
    { label: "About", href: `/#${landingSectionIds.about}` },
    { label: "Services", href: `/#${landingSectionIds.services}` },
    { label: "How It Works", href: `/#${landingSectionIds.howItWorks}` },
    { label: "FAQ", href: `/#${landingSectionIds.faq}` },
  ],
  services: [
    { label: "Get Started", href: "/get-started" },
    { label: "Contact", href: "/contact" },
    { label: "All Services", href: "/services" },
    { label: "Pricing", href: "/pricing" },
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
