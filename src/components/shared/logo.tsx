import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Intrinsic size of /public/logos/haulix-logo.png (transparent background). */
const LOGO_WIDTH = 960;
const LOGO_HEIGHT = 349;

interface LogoProps {
  className?: string;
  /** "md" for the navbar, "lg" for the footer. */
  size?: "md" | "lg";
  /** Preload when the logo is above the fold (navbar). */
  preload?: boolean;
}

/**
 * Official HAULIX Logistics speedmark. The PNG was cut from the supplied artwork
 * with a transparent background, so it sits on any of the dark brand surfaces.
 * Replace with an SVG export when one is available.
 */
export function Logo({ className, size = "md", preload = false }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} Logistics home`}
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      <Image
        src="/logos/haulix-logo.png"
        alt={`${siteConfig.name} Logistics`}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        preload={preload}
        sizes={size === "lg" ? "220px" : "150px"}
        className={cn("w-auto", size === "lg" ? "h-16 sm:h-20" : "h-11 sm:h-12")}
      />
    </Link>
  );
}
