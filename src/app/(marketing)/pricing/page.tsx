import { Container } from "@/components/shared/container";
import { CtaSection } from "@/components/shared/cta-section";
import { PageHeader } from "@/components/shared/page-header";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { PricingCard } from "@/components/pricing/pricing-card";
import { pricingPage, pricingPlans } from "@/content/pricing";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Pricing",
  description:
    "Request a dispatch quote from HAULIX Logistics. We price around your equipment, truck count, lanes and the support you need.",
  path: "/pricing",
});

export default function PricingPage() {
  const { header, approach, factors, profiles, steps, cta } = pricingPage;

  return (
    <>
      <PageHeader
        photo="sunset"
        eyebrow={header.eyebrow}
        title={header.title}
        description={header.description}
        breadcrumbs={[{ label: "Pricing", href: "/pricing" }]}
      />

      {/* Approach and quote factors */}
      <section aria-labelledby="approach-title" className="section-y">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-12">
            <Reveal className="lg:col-span-6">
              <SectionHeading
                id="approach-title"
                eyebrow={approach.eyebrow}
                title={approach.title}
              />
              <div className="mt-6 space-y-4 text-base leading-relaxed text-subtle-foreground sm:text-lg">
                {approach.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-6">
              <div className="bg-ember rounded-panel border border-white/10 p-7 sm:p-9">
                <p className="text-sm font-semibold text-orange">{factors.eyebrow}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">{factors.title}</h2>
                <dl className="mt-7 space-y-3">
                  {factors.items.map((item) => (
                    <div
                      key={item.title}
                      className="grid gap-1 rounded-xl bg-white/5 p-4 sm:grid-cols-[11rem_1fr] sm:gap-6"
                    >
                      <dt className="font-display font-semibold text-white">{item.title}</dt>
                      <dd className="text-sm leading-relaxed text-subtle-foreground">
                        {item.description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Quote profiles */}
      <section aria-labelledby="profiles-title" className="section-y">
        <Container>
          <Reveal>
            <SectionHeading
              id="profiles-title"
              eyebrow={profiles.eyebrow}
              title={profiles.title}
              description={profiles.description}
              align="center"
            />
          </Reveal>
          <ul className="mt-14 grid gap-5 lg:grid-cols-3">
            {pricingPlans.map((plan, index) => (
              <li key={plan.id}>
                <Reveal delay={index * 0.06} className="h-full">
                  <PricingCard plan={plan} ctaLabel={profiles.ctaLabel} />
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Quote steps */}
      <section aria-labelledby="quote-steps-title" className="section-b">
        <Container>
          <div className="rounded-banner border border-white/10 bg-ink-warm/60 p-8 sm:p-12">
            <Reveal>
              <SectionHeading id="quote-steps-title" eyebrow={steps.eyebrow} title={steps.title} />
            </Reveal>
            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {steps.items.map((step, index) => (
                <li key={step.title}>
                  <Reveal delay={index * 0.06}>
                    <span className="inline-flex size-11 items-center justify-center rounded-full bg-orange font-display font-semibold text-ink">
                      {index + 1}
                    </span>
                    <h3 className="mt-5 text-xl font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-subtle-foreground">
                      {step.description}
                    </p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <CtaSection
        headingId="pricing-cta-title"
        spacing="bottom"
        title={cta.title}
        description={cta.description}
        primary={cta.primary}
        image={{ src: "/images/hero/truck-night-trails.jpg", objectPosition: "75% 50%" }}
      />
    </>
  );
}
