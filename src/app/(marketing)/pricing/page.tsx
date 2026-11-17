import { Container } from "@/components/shared/container";
import { CtaSection } from "@/components/shared/cta-section";
import { PageHeader } from "@/components/shared/page-header";
import { PricingCard } from "@/components/pricing/pricing-card";
import { pricingPlans } from "@/content/pricing";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Pricing",
  description: "Dispatch pricing for owner-operators, small fleets and larger carriers.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Simple, transparent pricing"
        description="Final pricing will be published here. Get in touch to discuss what fits your operation."
        breadcrumbs={[{ label: "Pricing", href: "/pricing" }]}
      />
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
        </Container>
      </section>
      <CtaSection />
    </>
  );
}
