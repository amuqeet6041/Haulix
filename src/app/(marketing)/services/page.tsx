import { Container } from "@/components/shared/container";
import { CtaSection } from "@/components/shared/cta-section";
import { PageHeader } from "@/components/shared/page-header";
import { ServiceCard } from "@/components/services/service-card";
import { equipmentServices } from "@/content/services";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Dispatch Services",
  description:
    "Truck dispatching for dry van, reefer, flatbed, step deck, power only, box truck and hotshot equipment.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Dispatch services by equipment type"
        description="Pick your equipment to see how we can support your operation."
        breadcrumbs={[{ label: "Services", href: "/services" }]}
      />
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {equipmentServices.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </Container>
      </section>
      <CtaSection />
    </>
  );
}
