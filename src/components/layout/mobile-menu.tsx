"use client";

import { ArrowUpRight, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { isCurrent } from "@/components/layout/nav-utils";
import { PrimaryButton } from "@/components/shared/primary-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getStartedLink, mainNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  pathname: string;
  activeSection: string | null;
}

/** Slide-over navigation shown below the `lg` breakpoint. */
export function MobileMenu({ pathname, activeSection }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="lg:hidden" aria-label="Open menu">
          <Menu aria-hidden="true" />
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetTitle className="font-display text-lg font-bold text-white">
          {siteConfig.name} Logistics
        </SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>
        <nav aria-label="Mobile" className="mt-4 flex flex-col">
          {mainNav.map((item) => {
            const current = isCurrent(item.href, pathname, activeSection);
            return (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between border-b border-border py-4 font-display text-lg font-semibold text-white transition-colors hover:text-orange",
                    current && "text-orange",
                  )}
                >
                  {item.label}
                  <ArrowUpRight className="size-4 opacity-60" aria-hidden="true" />
                </Link>
              </SheetClose>
            );
          })}
        </nav>
        <div className="mt-auto pt-6">
          <SheetClose asChild>
            <PrimaryButton href={getStartedLink.href} size="lg" className="w-full">
              {getStartedLink.label}
            </PrimaryButton>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
