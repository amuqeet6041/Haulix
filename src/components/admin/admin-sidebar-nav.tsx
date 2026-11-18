"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNav, isAdminNavCurrent } from "@/config/admin-navigation";
import { cn } from "@/lib/utils";

interface AdminSidebarNavProps {
  /** Accessible name. The desktop sidebar and the mobile drawer need different names. */
  label: string;
  /** Wraps each link, e.g. in a SheetClose so choosing a page closes the drawer. */
  wrapLink?: (link: React.ReactElement, key: string) => React.ReactElement;
}

/** The three admin links with the current section marked via aria-current. */
export function AdminSidebarNav({ label, wrapLink }: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-1">
        {adminNav.map((item) => {
          const current = isAdminNavCurrent(item.href, pathname);
          const Icon = item.icon;
          const link = (
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                current
                  ? "border-orange bg-orange/10 text-foreground"
                  : "border-transparent text-gray hover:bg-cream/5 hover:text-foreground",
              )}
            >
              <Icon
                className={cn("size-4.5 shrink-0", current ? "text-orange" : "text-gray")}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
          return <li key={item.href}>{wrapLink ? wrapLink(link, item.href) : link}</li>;
        })}
      </ul>
    </nav>
  );
}
