import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MobileMenu } from "@/components/layout/mobile-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

function renderSheet(side?: "left" | "right") {
  render(
    <Sheet open>
      <SheetContent side={side}>
        <SheetTitle>Menu</SheetTitle>
        <SheetDescription>Navigation</SheetDescription>
      </SheetContent>
    </Sheet>,
  );
  return screen.getByRole("dialog");
}

/**
 * The shared Sheet also draws the public website's mobile menu, which has
 * always slid in from the right. These tests pin that default so a change for
 * the admin drawer (side="left") can never move the public menu.
 */
describe("Sheet default side", () => {
  it("slides in from the right when no side is given", () => {
    const panel = renderSheet();
    expect(panel).toHaveClass(
      "right-0",
      "data-[state=open]:slide-in-from-right",
      "data-[state=closed]:slide-out-to-right",
    );
    expect(panel).not.toHaveClass("left-0");
    expect(panel.className).not.toMatch(/slide-(in-from|out-to)-left/);
  });

  it('treats side="right" exactly like the default', () => {
    const panel = renderSheet("right");
    expect(panel).toHaveClass("right-0", "data-[state=open]:slide-in-from-right");
    expect(panel).not.toHaveClass("left-0");
  });

  it("slides in from the left only when asked (the admin drawer)", () => {
    const panel = renderSheet("left");
    expect(panel).toHaveClass(
      "left-0",
      "data-[state=open]:slide-in-from-left",
      "data-[state=closed]:slide-out-to-left",
    );
    expect(panel).not.toHaveClass("right-0");
    expect(panel.className).not.toMatch(/slide-(in-from|out-to)-right/);
  });

  it("keeps the same size, surface and layout classes for both sides", () => {
    const shared = [
      "fixed",
      "inset-y-0",
      "z-50",
      "flex",
      "h-full",
      "w-[min(22rem,90vw)]",
      "flex-col",
      "gap-4",
      "overflow-y-auto",
      "bg-ink",
      "p-6",
      "text-white",
      "shadow-lift",
      "data-[state=open]:animate-in",
      "data-[state=closed]:animate-out",
    ];
    cleanup();
    expect(renderSheet()).toHaveClass(...shared);
    cleanup();
    expect(renderSheet("left")).toHaveClass(...shared);
  });
});

describe("public website menu", () => {
  it("still opens as a right-hand panel with its original look", async () => {
    const u = userEvent.setup();
    render(<MobileMenu pathname="/" activeSection={null} />);
    await u.click(screen.getByRole("button", { name: "Open menu" }));

    const panel = await screen.findByRole("dialog");
    expect(panel).toHaveClass(
      "fixed",
      "inset-y-0",
      "right-0",
      "z-50",
      "w-[min(22rem,90vw)]",
      "bg-ink",
      "data-[state=open]:slide-in-from-right",
      "data-[state=closed]:slide-out-to-right",
    );
    expect(panel).not.toHaveClass("left-0");
    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
  });
});
