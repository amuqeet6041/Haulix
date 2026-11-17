import { equipmentServices } from "@/content/services";

export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

export interface NavGroup {
  label: string;
  href?: string;
  children: NavLink[];
}

export type NavItem = ({ type: "link" } & NavLink) | ({ type: "group" } & NavGroup);

export const mainNav: NavItem[] = [
  { type: "link", label: "Home", href: "/" },
  { type: "link", label: "About", href: "/about" },
  {
    type: "group",
    label: "Services",
    href: "/services",
    children: [
      { label: "All Services", href: "/services" },
      ...equipmentServices.map((service) => ({
        label: service.name,
        href: `/services/${service.slug}`,
      })),
    ],
  },
  { type: "link", label: "Pricing", href: "/pricing" },
  { type: "link", label: "How It Works", href: "/how-it-works" },
  {
    type: "group",
    label: "Resources",
    href: "/resources",
    children: [
      { label: "Resources", href: "/resources" },
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  { type: "link", label: "Contact", href: "/contact" },
];

export const getStartedLink: NavLink = { label: "Get Started", href: "/get-started" };

export const footerNav = {
  company: [
    { label: "About", href: "/about" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "Contact", href: "/contact" },
  ],
  services: [
    { label: "All Services", href: "/services" },
    { label: "Get Started", href: "/get-started" },
    { label: "FAQ", href: "/faq" },
    { label: "Resources", href: "/resources" },
    { label: "Blog", href: "/blog" },
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
