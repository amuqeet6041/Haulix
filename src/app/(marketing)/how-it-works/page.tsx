import { Container } from "@/components/shared/container";
import { CtaSection } from "@/components/shared/cta-section";
import { FeatureCard } from "@/components/shared/feature-card";
import { PageHeader } from "@/components/shared/page-header";
import { processSteps } from "@/content/process";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "How It Works",
  description: "See how carriers get started with HAULIX, from first inquiry to first load.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="How it works"
        title="How HAULIX works"
        description="A straightforward path from your first inquiry to moving freight."
        breadcrumbs={[{ label: "How It Works", href: "/how-it-works" }]}
      />
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step, index) => (
              <FeatureCard
                key={step.title}
                step={index + 1}
                title={step.title}
                description={step.description}
              />
            ))}
          </div>
        </Container>
      </section>
      <CtaSection />
    </>
  );
}
