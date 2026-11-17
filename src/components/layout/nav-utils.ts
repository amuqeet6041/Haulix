import { useEffect, useState } from "react";

import { mainNav } from "@/config/navigation";

/** Returns the `#fragment` of an href without the hash, or null. */
export function hashOf(href: string): string | null {
  const index = href.indexOf("#");
  return index === -1 ? null : href.slice(index + 1);
}

/** Whether a nav link points at the current page or the landing section in view. */
export function isCurrent(href: string, pathname: string, activeSection: string | null): boolean {
  const hash = hashOf(href);
  if (hash) return pathname === "/" && activeSection === hash;
  if (href === "/") return pathname === "/" && activeSection === null;
  return pathname === href;
}

/**
 * Tracks which landing-page section is in view so the matching nav link can be
 * marked current. Only runs on the homepage.
 */
export function useActiveSection(enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const ids = mainNav.map((item) => hashOf(item.href)).filter((id): id is string => !!id);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
        else if (window.scrollY < 200) setActive(null);
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [enabled]);

  return enabled ? active : null;
}
