import { Check } from "lucide-react";
import Image from "next/image";

import { ArrowLink } from "@/components/shared/arrow-link";
import { Container } from "@/components/shared/container";
import { CtaSection } from "@/components/shared/cta-section";
import { PageHeader } from "@/components/shared/page-header";
import { PrimaryButton } from "@/components/shared/primary-button";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { howItWorksPage, onboardingSteps } from "@/content/how-it-works";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "How It Works",
  description:
    "See how carriers get started with HAULIX Logistics and how each load comes together, from load search and booking to delivery and paperwork.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  const { header, onboarding, loadCycle, prepare, cta } = howItWorksPage;

  return (
    <>
      <PageHeader
        eyebrow={header.eyebrow}
        title={header.title}
        description={header.description}
        breadcrumbs={[{ label: "How It Works", href: "/how-it-works" }]}
      />

      {/* Onboarding timeline */}
      <section aria-labelledby="onboarding-title" className="section-y">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <Reveal className="lg:sticky lg:top-28">
                <SectionHeading
                  id="onboarding-title"
                  eyebrow={onboarding.eyebrow}
                  title={onboarding.title}
                  description={onboarding.description}
                />
                <PrimaryButton href="/get-started" size="xl" className="mt-9 px-8">
                  Start step one
                </PrimaryButton>
              </Reveal>
            </div>

            <ol className="relative lg:col-span-7">
              <span
                aria-hidden="true"
                className="absolute top-3 bottom-3 left-[1.375rem] w-px bg-gradient-to-b from-orange via-orange/40 to-transparent"
              />
              {onboardingSteps.map((step, index) => (
                <li key={step.title} className="relative pb-12 pl-16 last:pb-0 sm:pl-20">
                  <Reveal delay={index * 0.06}>
                    <span
                      aria-hidden="true"
                      className="absolute top-0 left-0 flex size-11 items-center justify-center rounded-full border border-orange bg-ink font-display text-sm font-semibold text-orange"
                    >
                      {index + 1}
                    </span>
                    <p className="font-display text-xs font-semibold tracking-[0.2em] text-orange uppercase">
                      Step {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-gray">{step.description}</p>
                    <p className="mt-3 leading-relaxed text-subtle-foreground">{step.detail}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* Load cycle */}
      <section
        aria-labelledby="load-cycle-title"
        className="bg-ember relative overflow-hidden section-y"
      >
        <Container>
          <Reveal>
            <SectionHeading
              id="load-cycle-title"
              eyebrow={loadCycle.eyebrow}
              title={loadCycle.title}
              description={loadCycle.description}
            />
          </Reveal>
          <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {loadCycle.stages.map((stage, index) => (
              <li key={stage.title} className="h-full">
                <Reveal delay={index * 0.06} className="h-full">
                  <div className="flex h-full flex-col rounded-panel border border-white/10 bg-ink/60 p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-3xl font-light tracking-tight text-orange">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span aria-hidden="true" className="h-px flex-1 bg-white/15" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold tracking-tight">{stage.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-subtle-foreground">
                      {stage.description}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* What to have ready */}
      <section aria-labelledby="prepare-title" className="section-y">
        <Container>
          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
            <Reveal className="relative order-last lg:order-first lg:col-span-5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-media border border-white/10 shadow-lift sm:aspect-[16/10] lg:aspect-[4/5]">
                <Image
                  src="/images/hero/truck-night-trails.jpg"
                  alt={prepare.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 38vw, 100vw"
                  className="object-cover object-[64%_50%]"
                />
                <div aria-hidden="true" className="bg-image-shade absolute inset-0" />
              </div>
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-7">
              <SectionHeading
                id="prepare-title"
                eyebrow={prepare.eyebrow}
                title={prepare.title}
                description={prepare.description}
              />
              <ul className="mt-9 grid gap-3 sm:grid-cols-2">
                {prepare.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-2xl card-surface p-5 text-sm text-gray"
                  >
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-orange text-ink">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="pt-0.5">{item}</span>
                  </li>
                ))}
              </ul>
              <ArrowLink href="/faq" className="mt-8">
                More questions? Read the FAQ
              </ArrowLink>
            </Reveal>
          </div>
        </Container>
      </section>

      <CtaSection
        headingId="how-cta-title"
        spacing="bottom"
        title={cta.title}
        description={cta.description}
      />
    </>
  );
}
