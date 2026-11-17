"use client";

import { ArrowUp } from "lucide-react";

import { useScrolledPast } from "@/hooks/use-scrolled-past";
import { cn } from "@/lib/utils";

interface BackToTopProps {
  /** Scroll distance in pixels before the button appears. */
  threshold?: number;
}

/**
 * Floating "back to top" control. Hidden (and removed from the tab order) until
 * the page has scrolled, then scrolls smoothly unless the visitor prefers
 * reduced motion. Focus moves to the site header so keyboard users are not
 * left on a control that disappears.
 */
export function BackToTop({ threshold = 600 }: BackToTopProps) {
  const visible = useScrolledPast(threshold);

  function scrollToTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    document.querySelector<HTMLElement>("header a")?.focus({ preventScroll: true });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed right-5 bottom-5 z-30 inline-flex size-11 items-center justify-center rounded-full border border-white/15 bg-ink/80 text-white shadow-lift backdrop-blur-md transition-all duration-300 hover:border-orange hover:bg-orange hover:text-ink motion-reduce:transition-none sm:right-8 sm:bottom-8",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}
