import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ServiceCard } from "@/components/services/service-card";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { landingSectionIds } from "@/config/navigation";
import { equipment, equipmentCategories } from "@/content/landing";
import { equipmentServices } from "@/content/services";

export function EquipmentSection() {
  return (
    <section
      id={landingSectionIds.equipment}
      aria-labelledby="equipment-title"
      className="section-y"
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="equipment-title"
            eyebrow={equipment.eyebrow}
            title={equipment.title}
            description={equipment.description}
          />
        </Reveal>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {equipmentServices.map((service, index) => (
            <li key={service.slug}>
              <Reveal delay={Math.min(index * 0.04, 0.24)} className="h-full">
                <ServiceCard
                  service={service}
                  category={equipmentCategories[service.slug]}
                  shortName
                />
              </Reveal>
            </li>
          ))}
          <li>
            <Reveal delay={0.28} className="h-full">
              <Link
                href="/get-started"
                className="group flex h-full min-h-56 flex-col justify-between rounded-2xl border border-orange/30 bg-brown p-6 text-white transition-all duration-300 hover:-translate-y-1 hover:border-orange motion-reduce:hover:translate-y-0"
              >
                <span className="text-sm font-semibold text-orange">Not listed?</span>
                <span>
                  <span className="block font-display text-xl font-semibold tracking-tight">
                    Tell us about your truck
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange">
                    Get Started
                    <ArrowRight
                      className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </Link>
            </Reveal>
          </li>
        </ul>
      </Container>
    </section>
  );
}
