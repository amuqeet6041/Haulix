import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ServiceCard } from "@/components/services/service-card";
import { OutlineButton } from "@/components/shared/action-button";
import { ArrowLink } from "@/components/shared/arrow-link";
import { BackToTop } from "@/components/shared/back-to-top";
import { CtaSection } from "@/components/shared/cta-section";
import { SecondaryButton } from "@/components/shared/secondary-button";
import { buttonVariants } from "@/components/ui/button";
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

describe("Button variants", () => {
  it("keeps dark text on the orange primary button for contrast", () => {
    expect(buttonVariants({ variant: "primary" })).toContain("text-primary-foreground");
  });

  it("renders the outline variant as a link", () => {
    render(<OutlineButton href="/get-started">Get Started</OutlineButton>);
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "href",
      "/get-started",
    );
  });

  it("does not forward the legacy onDark prop to the DOM", () => {
    render(<SecondaryButton onDark>Contact</SecondaryButton>);
    expect(screen.getByRole("button", { name: "Contact" })).not.toHaveAttribute("ondark");
  });
});

describe("ArrowLink", () => {
  it("renders a link with a decorative arrow", () => {
    render(<ArrowLink href="/contact">Contact us</ArrowLink>);
    const link = screen.getByRole("link", { name: "Contact us" });
    expect(link).toHaveAttribute("href", "/contact");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("ServiceCard", () => {
  const service = equipmentServices[0]!;

  it("links to the equipment page", () => {
    render(<ServiceCard service={service} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", `/services/${service.slug}`);
    expect(screen.getByRole("heading", { name: service.name })).toBeInTheDocument();
  });

  it("shows a category chip and the short name when asked", () => {
    render(<ServiceCard service={service} category="Enclosed" shortName />);
    expect(screen.getByText("Enclosed")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: service.name.replace(/ Dispatch$/, "") }),
    ).toBeInTheDocument();
  });
});

describe("CtaSection", () => {
  it("labels the section by its heading and renders both actions", () => {
    render(<CtaSection title="Ready?" headingId="test-cta" />);
    expect(screen.getByRole("region", { name: "Ready?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "href",
      "/get-started",
    );
    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute("href", "/contact");
  });

  it("can hide the secondary action", () => {
    render(<CtaSection secondary={null} />);
    expect(screen.queryByRole("link", { name: "Contact Us" })).not.toBeInTheDocument();
  });
});

describe("BackToTop", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.scrollY = 0;
  });

  it("stays out of the tab order until the page scrolls", () => {
    const { container } = render(<BackToTop threshold={100} />);
    const button = container.querySelector("button")!;
    expect(button).toHaveAttribute("aria-hidden", "true");
    expect(button).toHaveAttribute("tabindex", "-1");

    window.scrollY = 500;
    fireEvent.scroll(window);
    expect(button).toHaveAttribute("tabindex", "0");
  });

  it("scrolls to the top when clicked", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as never;
    window.scrollY = 500;
    render(<BackToTop threshold={100} />);

    fireEvent.click(screen.getByRole("button", { name: "Back to top" }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
