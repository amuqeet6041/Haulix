import { Check } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { CtaSection } from "@/components/shared/cta-section";
import { PageHeader } from "@/components/shared/page-header";
import { PrimaryButton } from "@/components/shared/primary-button";
import { equipmentServices, getEquipmentService } from "@/content/services";
import { buildMetadata } from "@/lib/seo";

interface EquipmentPageProps {
  params: Promise<{ equipment: string }>;
}

/** Pre-render one static page per equipment type. */
export function generateStaticParams() {
  return equipmentServices.map((service) => ({ equipment: service.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: EquipmentPageProps): Promise<Metadata> {
  const { equipment } = await params;
  const service = getEquipmentService(equipment);
  if (!service) return {};

  return buildMetadata({
    title: service.name,
    description: service.description,
    path: `/services/${service.slug}`,
  });
}

export default async function EquipmentPage({ params }: EquipmentPageProps) {
  const { equipment } = await params;
  const service = getEquipmentService(equipment);
  if (!service) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Equipment"
        title={service.name}
        description={service.shortDescription}
        breadcrumbs={[
          { label: "Equipment", href: "/equipment" },
          { label: service.name, href: `/services/${service.slug}` },
        ]}
      />
      <section className="py-16 sm:py-20">
        <Container narrow>
          <p className="text-lg leading-relaxed">{service.description}</p>
          <h2 className="mt-12 text-2xl">What we help with</h2>
          <ul className="mt-5 space-y-3">
            {service.highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-3">
                <Check className="mt-1 size-5 shrink-0 text-orange" aria-hidden="true" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <PrimaryButton href="/get-started" size="lg">
              Get started with {service.name.replace(" Dispatch", "")}
            </PrimaryButton>
          </div>
        </Container>
      </section>
      <CtaSection />
    </>
  );
}
