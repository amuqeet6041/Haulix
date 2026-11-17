import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ArrowLinkProps {
  href: string;
  children: ReactNode;
  /**
   * - "light": cream text, orange arrow (default, inline next to buttons or copy).
   * - "accent": orange text with an underline on hover.
   */
  tone?: "light" | "accent";
  /** "right" for in-page/next steps, "up-right" for links that open a new page or section. */
  icon?: "right" | "up-right";
  className?: string;
}

/** Text link with a trailing arrow that nudges on hover. */
export function ArrowLink({
  href,
  children,
  tone = "light",
  icon = "right",
  className,
}: ArrowLinkProps) {
  const Icon = icon === "up-right" ? ArrowUpRight : ArrowRight;

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 text-sm font-semibold transition-colors",
        tone === "light"
          ? "text-white hover:text-orange"
          : "text-orange underline-offset-4 hover:underline",
        className,
      )}
    >
      {children}
      <Icon
        aria-hidden="true"
        className={cn(
          "size-4 transition-transform duration-200 motion-reduce:transition-none",
          tone === "light" && "text-orange",
          icon === "right" && "group-hover:translate-x-1",
        )}
      />
    </Link>
  );
}
