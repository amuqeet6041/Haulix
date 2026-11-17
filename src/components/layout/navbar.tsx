"use client";

import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/shared/logo";
import { PrimaryButton } from "@/components/shared/primary-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getStartedLink, mainNav, type NavItem } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const linkClasses =
  "rounded-md px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:text-brand-500";

/**
 * Carrier Login. Disabled until the Carrier Portal (Module 2) exists.
 * Flip `siteConfig.portal.enabled` to turn it into a real link.
 */
function CarrierLogin({ className }: { className?: string }) {
  if (siteConfig.portal.enabled) {
    return (
      <Link href={siteConfig.portal.loginPath} className={cn(linkClasses, className)}>
        Carrier Login
      </Link>
    );
  }
  return (
    <span
      aria-disabled="true"
      title="The carrier portal is coming soon"
      className={cn(
        "inline-flex cursor-not-allowed items-center gap-2 px-3 py-2 text-sm font-medium text-on-dark-muted",
        className,
      )}
    >
      Carrier Login
      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] tracking-wide uppercase">
        Soon
      </span>
    </span>
  );
}

function DesktopItem({ item, pathname }: { item: NavItem; pathname: string }) {
  if (item.type === "link") {
    return (
      <Link
        href={item.href}
        aria-current={isActive(pathname, item.href) ? "page" : undefined}
        className={cn(linkClasses, isActive(pathname, item.href) && "text-white")}
      >
        {item.label}
      </Link>
    );
  }

  const groupActive = item.children.some((child) => isActive(pathname, child.href));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(linkClasses, "inline-flex items-center gap-1", groupActive && "text-white")}
      >
        {item.label}
        <ChevronDown className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {item.children.map((child) => (
          <DropdownMenuItem key={child.href} asChild>
            <Link href={child.href}>{child.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="onDark" size="sm" className="lg:hidden" aria-label="Open menu">
          <Menu aria-hidden="true" />
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetTitle className="text-lg font-bold text-white">{siteConfig.name}</SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>
        <nav aria-label="Mobile" className="flex flex-col gap-1">
          {mainNav.map((item) =>
            item.type === "link" ? (
              <SheetClose asChild key={item.href}>
                <Link href={item.href} className="rounded-md px-2 py-2.5 font-medium text-white">
                  {item.label}
                </Link>
              </SheetClose>
            ) : (
              <div key={item.label} className="py-1">
                <p className="px-2 pb-1 text-xs font-semibold tracking-widest text-on-dark-muted uppercase">
                  {item.label}
                </p>
                {item.children.map((child) => (
                  <SheetClose asChild key={child.href}>
                    <Link
                      href={child.href}
                      className="block rounded-md px-2 py-2 text-sm text-white/90"
                    >
                      {child.label}
                    </Link>
                  </SheetClose>
                ))}
              </div>
            ),
          )}
        </nav>
        <div className="mt-2 flex flex-col gap-3 border-t border-white/10 pt-5">
          <CarrierLogin className="px-2" />
          <SheetClose asChild>
            <PrimaryButton href={getStartedLink.href} className="w-full">
              {getStartedLink.label}
            </PrimaryButton>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-900/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
          {mainNav.map((item) => (
            <DesktopItem key={item.label} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <CarrierLogin />
          <PrimaryButton href={getStartedLink.href} size="sm">
            {getStartedLink.label}
          </PrimaryButton>
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
