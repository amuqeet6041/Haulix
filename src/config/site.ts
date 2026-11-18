import { joinUrl } from "@/lib/utils";

const DEFAULT_DEV_URL = "http://localhost:3000";

/**
 * Base URL of the site. Comes from NEXT_PUBLIC_SITE_URL so we never hard-code a
 * production domain. Falls back to localhost for local development.
 */
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const siteUrl = (rawSiteUrl && rawSiteUrl.length > 0 ? rawSiteUrl : DEFAULT_DEV_URL).replace(
  /\/+$/,
  "",
);

export const siteConfig = {
  name: "HAULIX",
  legalName: "HAULIX",
  tagline: "Truck dispatching for owner-operators and small fleets",
  description:
    "HAULIX is an American truck dispatching company helping owner-operators, independent truck owners and small fleets find freight and keep their trucks moving.",
  url: siteUrl,
  locale: "en_US",
  /**
   * Official public contact details. The footer, contact page and contact
   * section only render values that are set. `phoneHref` is the dialable form
   * of `phone`.
   */
  contact: {
    email: "support@haulixlogistics.com",
    phone: "+1 (703) 301-6888",
    phoneHref: "tel:+17033016888",
    address: "",
  },
  /** Social profiles. Add real URLs; empty entries are not rendered. */
  social: [
    { label: "Facebook", href: "" },
    { label: "Instagram", href: "" },
    { label: "LinkedIn", href: "" },
    { label: "YouTube", href: "" },
  ],
  /**
   * Carrier Portal (Module 2). While false, "Carrier Login" renders as a
   * disabled item. Flip to true when /portal/login exists.
   */
  portal: {
    enabled: false,
    basePath: "/portal",
    loginPath: "/portal/login",
  },
} as const;

/** Absolute URL for a path on this site. */
export function absoluteUrl(path = "/"): string {
  return joinUrl(siteConfig.url, path);
}
