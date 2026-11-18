import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FinalCtaSection } from "@/components/home/final-cta-section";
import { Footer } from "@/components/layout/footer";
import { ContactDetails, contactDetails } from "@/components/shared/contact-details";
import { PageHeader } from "@/components/shared/page-header";
import { Eyebrow } from "@/components/shared/section-heading";
import { EquipmentIllustration } from "@/components/services/equipment-illustration";
import { ServiceCard } from "@/components/services/service-card";
import { siteConfig } from "@/config/site";
import { equipmentServices, equipmentSlugs } from "@/content/services";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({}) }));

// The Reveal animation wrapper observes scroll position; jsdom has no IntersectionObserver.
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

afterEach(cleanup);

const PHONE = "+1 (703) 301-6888";
const PHONE_HREF = "tel:+17033016888";
const EMAIL = "support@haulixlogistics.com";

describe("official contact details", () => {
  it("are configured exactly once, in the site config", () => {
    expect(siteConfig.contact.phone).toBe(PHONE);
    expect(siteConfig.contact.phoneHref).toBe(PHONE_HREF);
    expect(siteConfig.contact.email).toBe(EMAIL);
    expect(siteConfig.contact.address).toBe("");
  });

  it("lists phone then email, as links", () => {
    const details = contactDetails();
    expect(details.map((d) => [d.key, d.label, d.href])).toEqual([
      ["phone", PHONE, PHONE_HREF],
      ["email", EMAIL, `mailto:${EMAIL}`],
    ]);
  });

  it.each(["list", "cards", "pills"] as const)(
    "the %s layout shows both as clickable links",
    (variant) => {
      render(<ContactDetails variant={variant} />);
      expect(screen.getByRole("link", { name: /301-6888/ })).toHaveAttribute("href", PHONE_HREF);
      expect(screen.getByRole("link", { name: new RegExp(EMAIL) })).toHaveAttribute(
        "href",
        `mailto:${EMAIL}`,
      );
    },
  );

  it("the dialable link has no spaces or punctuation", () => {
    expect(PHONE_HREF).toMatch(/^tel:\+\d+$/);
  });

  it("the footer shows the phone and email as links, and no placeholder text", () => {
    render(<Footer />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: PHONE })).toHaveAttribute("href", PHONE_HREF);
    expect(within(footer).getByRole("link", { name: EMAIL })).toHaveAttribute(
      "href",
      `mailto:${EMAIL}`,
    );
    expect(footer).not.toHaveTextContent(/contact form to reach/i);
  });

  it("the closing call-to-action band shows them as links too", () => {
    render(<FinalCtaSection />);
    expect(screen.getByRole("link", { name: PHONE })).toHaveAttribute("href", PHONE_HREF);
    expect(screen.getByRole("link", { name: EMAIL })).toHaveAttribute("href", `mailto:${EMAIL}`);
  });
});

describe("no other contact details in public code", () => {
  const roots = [
    "content",
    "config",
    "components/home",
    "components/layout",
    "components/shared",
    "components/pricing",
    "app/(marketing)",
  ];
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
    });

  it("only the official email and phone appear in public pages and content", () => {
    const src = path.resolve(__dirname, "../../src");
    const emails = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
    const phones = /\+?1?[ .-]?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/g;
    for (const root of roots) {
      for (const file of walk(path.join(src, root))) {
        const text = readFileSync(file, "utf8");
        for (const email of text.match(emails) ?? []) {
          expect(email, file).toBe(EMAIL);
        }
        for (const phone of text.match(phones) ?? []) {
          expect(phone, file).toBe(PHONE);
        }
      }
    }
  });
});

describe("visual components", () => {
  it("draws an illustration for every equipment type, hidden from screen readers", () => {
    for (const slug of equipmentSlugs) {
      const { container, unmount } = render(<EquipmentIllustration slug={slug} />);
      const svg = container.querySelector("svg")!;
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg.querySelectorAll("circle").length).toBeGreaterThanOrEqual(3);
      unmount();
    }
  });

  it("equipment cards show the illustration, the name, a link and no uppercase micro-label", () => {
    const service = equipmentServices[0]!;
    const { container } = render(<ServiceCard service={service} category="Enclosed" shortName />);
    expect(container.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Dry Van" })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", `/services/${service.slug}`);
    expect(screen.getByText("Enclosed").className).not.toMatch(/uppercase|tracking-\[/);
  });

  it("the eyebrow is a plain sentence-case label with no rule or letter spacing", () => {
    const { container } = render(<Eyebrow>About HAULIX</Eyebrow>);
    const label = screen.getByText("About HAULIX");
    expect(label.className).not.toMatch(/uppercase|tracking-/);
    expect(container.querySelector("span")).toBeNull();
  });

  it("page headers can show a decorative photo, and still render one h1", () => {
    const { container } = render(
      <PageHeader
        title="About us"
        breadcrumbs={[{ label: "About", href: "/about" }]}
        photo="sunset"
      />,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("alt")).toBe("");
    expect(img!.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("page headers without a photo have no image", () => {
    const { container } = render(
      <PageHeader title="About us" breadcrumbs={[{ label: "About", href: "/about" }]} />,
    );
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("decorative clutter stays out of public components", () => {
  it("has no numbered '01' labels, letter-spaced uppercase labels or hairline rules in the landing sections", () => {
    const dir = path.resolve(__dirname, "../../src/components/home");
    for (const file of readdirSync(dir)) {
      const text = readFileSync(path.join(dir, file), "utf8");
      expect(text, file).not.toMatch(/String\((index|i) \+ 1\)\.padStart/);
      expect(text, file).not.toMatch(/tracking-\[0\.\d+em\]/);
      expect(text, file).not.toMatch(/\bh-px\b|\bw-px\b|divide-[xy]/);
      expect(text, file).not.toMatch(/border-t border-|border-y border-/);
    }
  });
});
