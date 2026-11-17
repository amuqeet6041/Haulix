import { ArrowRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { CtaSection } from "@/components/shared/cta-section";
import { FeatureCard } from "@/components/shared/feature-card";
import { PrimaryButton } from "@/components/shared/primary-button";
import { Reveal } from "@/components/shared/reveal";
import { SecondaryButton } from "@/components/shared/secondary-button";
import { SectionHeading } from "@/components/shared/section-heading";
import { TrustBadge } from "@/components/shared/trust-badge";
import { ServiceCard } from "@/components/services/service-card";
import { TestimonialCard } from "@/components/home/testimonial-card";
import { processSteps } from "@/content/process";
import { equipmentServices } from "@/content/services";
import { testimonials } from "@/content/testimonials";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export const metadata = buildMetadata({
  title: siteConfig.tagline,
  description: siteConfig.description,
  path: "/",
});

const audiences = ["Owner-operators", "Independent truck owners", "Small and medium fleets"];

export default function HomePage() {
  return (
    <>
      <section className="bg-hero-gradient py-20 sm:py-28 lg:py-32">
        <Container>
          <Reveal>
            <p className="mb-5 text-sm font-semibold tracking-widest text-brand-500 uppercase">
              American truck dispatching
            </p>
            <h1 className="max-w-4xl text-4xl text-white sm:text-6xl lg:text-7xl">
              Keep your trucks moving. We handle the dispatch.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-on-dark-muted">
              HAULIX helps US owner-operators and small fleets find freight, negotiate rates and
              manage the paperwork, so you can focus on the road.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href="/get-started" size="lg">
                Get Started
                <ArrowRight aria-hidden="true" />
              </PrimaryButton>
              <SecondaryButton href="/services" size="lg" onDark>
                Explore Services
              </SecondaryButton>
            </div>
            <ul className="mt-10 flex flex-wrap gap-3" aria-label="Who HAULIX is for">
              {audiences.map((audience) => (
                <li key={audience}>
                  <TrustBadge label={audience} onDark />
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Services"
            title="Dispatch for every equipment type"
            description="Choose your equipment to see how HAULIX can support the way you haul."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {equipmentServices.map((service, index) => (
              <Reveal key={service.slug} delay={Math.min(index * 0.05, 0.25)}>
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-surface py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="How it works"
            title="From inquiry to your first load"
            description="A simple, transparent path for carriers who want a dispatcher in their corner."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.05}>
                <FeatureCard step={index + 1} title={step.title} description={step.description} />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {testimonials.length > 0 ? (
        <section className="py-20 sm:py-24">
          <Container>
            <SectionHeading eyebrow="Testimonials" title="What carriers say" />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <CtaSection />
    </>
  );
}
