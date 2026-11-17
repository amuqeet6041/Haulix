import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

/**
 * Temporary HAULIX wordmark with a simple chevron mark. Replace with the
 * final logo files in /public/logos when the brand assets are ready.
 */
export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} home`}
      className={cn("inline-flex items-center gap-2.5 text-white", className)}
    >
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true" fill="none">
        <rect width="32" height="32" rx="8" className="fill-brand-600" />
        <path
          d="M9 22V10m14 12V10M9 16h14"
          className="stroke-white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xl font-extrabold tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}
