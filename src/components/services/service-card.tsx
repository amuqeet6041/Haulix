import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ServiceIcon } from "@/components/services/service-icon";
import type { EquipmentService } from "@/content/services";

interface ServiceCardProps {
  service: EquipmentService;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-border bg-background p-6 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-lift"
    >
      <span className="mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-navy-900 text-brand-500">
        <ServiceIcon name={service.icon} className="size-5" />
      </span>
      <h3 className="text-lg">{service.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed">{service.shortDescription}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
        Learn more
        <ArrowRight
          className="size-4 transition-transform duration-200 group-hover:translate-x-1"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
