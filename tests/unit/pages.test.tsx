import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import AboutPage from "@/app/(marketing)/about/page";
import ContactPage from "@/app/(marketing)/contact/page";
import EquipmentPage from "@/app/(marketing)/equipment/page";
import HowItWorksPage from "@/app/(marketing)/how-it-works/page";
import PricingPage from "@/app/(marketing)/pricing/page";
import ServicesPage from "@/app/(marketing)/services/page";
import { footerNav, mainNav } from "@/config/navigation";
import { aboutPage } from "@/content/about";
import { contactPage } from "@/content/contact";
import { dispatchServices, servicesPage } from "@/content/dispatch-services";
import { equipmentPage } from "@/content/equipment-page";
import { howItWorksPage, onboardingSteps } from "@/content/how-it-works";
import { pricingPage, pricingPlans } from "@/content/pricing";
import { processSteps } from "@/content/process";
import { equipmentServices } from "@/content/services";

beforeAll(() => {
  // jsdom has no IntersectionObserver; Reveal (Framer Motion) needs one.
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
});

afterEach(cleanup);

/** Collects every string in a content object, recursively. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

const pageContent = {
  aboutPage,
  servicesPage,
  dispatchServices,
  howItWorksPage,
  onboardingSteps,
  equipmentPage,
  pricingPage,
  pricingPlans,
  contactPage,
};

describe("Phase 3 page copy", () => {
  it.each(Object.entries(pageContent))(
    "%s has no em dashes, en dashes or slashes",
    (_, content) => {
      for (const text of strings(content)) {
        // Internal links (hrefs) are allowed to contain slashes.
        if (text.startsWith("/")) continue;
        expect(text).not.toMatch(/[–—]/);
        expect(text).not.toMatch(/\s\/\s|\w\/\w/);
      }
    },
  );

  it("does not invent prices, percentages or guarantees on the pricing page", () => {
    for (const text of strings({ pricingPage, pricingPlans })) {
      expect(text).not.toMatch(/[$%]|\d+\s*(?:dollars|percent)/i);
      expect(text).not.toMatch(/guarantee/i);
    }
  });

  it("covers the six dispatch services", () => {
    expect(dispatchServices.map((service) => service.title)).toEqual([
      "Load Searching",
      "Rate Negotiation",
      "Route Planning",
      "Broker Communication",
      "Dispatch Management",
      "Documentation and Paperwork",
    ]);
  });

  it("adds a detail to every onboarding step", () => {
    expect(onboardingSteps).toHaveLength(processSteps.length);
    for (const step of onboardingSteps) expect(step.detail.length).toBeGreaterThan(0);
  });
});

describe("navigation", () => {
  it("links the main menu to the public pages", () => {
    const hrefs = mainNav.map((item) => item.href);
    for (const path of [
      "/about",
      "/services",
      "/how-it-works",
      "/equipment",
      "/pricing",
      "/contact",
    ]) {
      expect(hrefs).toContain(path);
    }
  });

  it("links the footer to the services and equipment pages", () => {
    const hrefs = footerNav.services.map((item) => item.href);
    expect(hrefs).toContain("/services");
    expect(hrefs).toContain("/equipment");
  });
});

describe("public pages", () => {
  it("renders the About page with mission, vision and values", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(aboutPage.header.title);
    expect(screen.getByRole("heading", { name: aboutPage.mission.label })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: aboutPage.vision.label })).toBeInTheDocument();
    for (const value of aboutPage.values.items) {
      expect(screen.getByRole("heading", { name: value.title })).toBeInTheDocument();
    }
  });

  it("renders every dispatch service on the Services page", () => {
    render(<ServicesPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(servicesPage.header.title);
    for (const service of dispatchServices) {
      expect(screen.getByRole("heading", { name: service.title })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /see equipment we dispatch/i })).toHaveAttribute(
      "href",
      "/equipment",
    );
  });

  it("renders onboarding steps and the load cycle on How It Works", () => {
    render(<HowItWorksPage />);
    for (const step of processSteps) {
      expect(screen.getByRole("heading", { name: step.title })).toBeInTheDocument();
    }
    for (const stage of howItWorksPage.loadCycle.stages) {
      expect(screen.getByRole("heading", { name: stage.title })).toBeInTheDocument();
    }
  });

  it("lists all seven equipment types with links to their detail pages", () => {
    render(<EquipmentPage />);
    expect(equipmentServices).toHaveLength(7);
    for (const service of equipmentServices) {
      expect(screen.getByRole("link", { name: `${service.name} details` })).toHaveAttribute(
        "href",
        `/services/${service.slug}`,
      );
    }
  });

  it("renders quote profiles that link to the inquiry form", () => {
    render(<PricingPage />);
    for (const plan of pricingPlans) {
      const card = screen.getByRole("article", { name: plan.name });
      expect(within(card).getByRole("link", { name: "Request a quote" })).toHaveAttribute(
        "href",
        "/get-started",
      );
    }
  });

  it("renders the contact form on the Contact page", () => {
    render(<ContactPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(contactPage.header.title);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });
});
