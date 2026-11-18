import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { EquipmentIllustration } from "@/components/services/equipment-illustration";
import type { EquipmentService } from "@/content/services";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  service: EquipmentService;
  /** Short trailer category (e.g. "Enclosed"), shown under the illustration. */
  category?: string;
  /** Show the name without the " Dispatch" suffix, for compact grids. */
  shortName?: boolean;
  ctaLabel?: string;
  className?: string;
}

/**
 * Equipment service card: an illustration of the equipment type, its name and
 * a short description. The whole card links to `/services/[slug]`.
 */
export function ServiceCard({
  service,
  category,
  shortName = false,
  ctaLabel = "View details",
  className,
}: ServiceCardProps) {
  const name = shortName ? service.name.replace(/ Dispatch$/, "") : service.name;

  return (
    <Link
      href={`/services/${service.slug}`}
      className={cn(
        "group flex h-full card-interactive flex-col rounded-2xl card-surface p-5 hover:bg-brown/60",
        className,
      )}
    >
      <div className="flex h-32 items-center justify-center rounded-xl bg-ink/60 px-4 py-3 transition-colors duration-300 group-hover:bg-ink/80">
        <EquipmentIllustration slug={service.slug} />
      </div>
      {category ? <p className="mt-5 text-sm font-medium text-orange-soft">{category}</p> : null}
      <h3 className={cn("text-xl font-semibold tracking-tight", category ? "mt-1" : "mt-5")}>
        {name}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-subtle-foreground">
        {service.shortDescription}
      </p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-colors group-hover:text-orange">
        {ctaLabel}
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
