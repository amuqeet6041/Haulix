import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { ServiceIcon } from "@/components/services/service-icon";
import type { EquipmentService } from "@/content/services";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  service: EquipmentService;
  /** Short trailer category shown as a chip (e.g. "Enclosed"). Replaces the icon when set. */
  category?: string;
  /** Show the name without the " Dispatch" suffix, for compact grids. */
  shortName?: boolean;
  ctaLabel?: string;
  className?: string;
}

/** Equipment service card. The whole card links to `/services/[slug]`. */
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
        "group flex h-full card-interactive flex-col rounded-2xl card-surface p-6 hover:bg-brown/60",
        className,
      )}
    >
      {category ? (
        <span className="inline-flex w-fit rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium tracking-[0.14em] text-orange-soft uppercase">
          {category}
        </span>
      ) : (
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brown text-orange">
          <ServiceIcon name={service.icon} className="size-5" />
        </span>
      )}
      <h3 className="mt-6 text-xl font-semibold tracking-tight">{name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-subtle-foreground">
        {service.shortDescription}
      </p>
      <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-colors group-hover:text-orange">
        {ctaLabel}
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
