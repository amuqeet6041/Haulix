"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MobileMenu } from "@/components/layout/mobile-menu";
import { isCurrent, useActiveSection } from "@/components/layout/nav-utils";
import { OutlineButton } from "@/components/shared/action-button";
import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";
import { getStartedLink, mainNav } from "@/config/navigation";
import { useScrolledPast } from "@/hooks/use-scrolled-past";
import { cn } from "@/lib/utils";

/** Sticky site header: transparent over the hero, frosted once the page scrolls. */
export function Navbar() {
  const pathname = usePathname();
  const activeSection = useActiveSection(pathname === "/");
  const scrolled = useScrolledPast(24);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "border-border bg-ink/85 backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <Container className="flex h-20 items-center justify-between gap-6">
        <Logo preload />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {mainNav.map((item) => {
            const current = isCurrent(item.href, pathname, activeSection);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "rounded-md px-3.5 py-2 text-sm font-medium text-gray transition-colors hover:text-white",
                  current && "text-orange hover:text-orange",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden lg:block">
          <OutlineButton href={getStartedLink.href} className="rounded-md px-6">
            {getStartedLink.label}
          </OutlineButton>
        </div>
        <MobileMenu pathname={pathname} activeSection={activeSection} />
      </Container>
    </header>
  );
}
