import Image from "next/image";

import { ArrowLink } from "@/components/shared/arrow-link";
import { Container } from "@/components/shared/container";
import { CtaSection } from "@/components/shared/cta-section";
import { PageHeader } from "@/components/shared/page-header";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { aboutPage } from "@/content/about";
import { about } from "@/content/landing";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "About Us",
  description:
    "HAULIX Logistics is a US truck dispatching company for owner-operators, independent truck owners and small fleets. Learn about our mission and how we work.",
  path: "/about",
});

export default function AboutPage() {
  const { header, intro, mission, vision, values, audience, cta } = aboutPage;

  return (
    <>
      <PageHeader
        eyebrow={header.eyebrow}
        title={header.title}
        description={header.description}
        breadcrumbs={[{ label: "About", href: "/about" }]}
      />

      {/* Introduction */}
      <section aria-labelledby="about-intro-title" className="section-y">
        <Container>
          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-6">
              <SectionHeading id="about-intro-title" eyebrow={intro.eyebrow} title={intro.title} />
              <div className="mt-6 space-y-4 text-base leading-relaxed text-subtle-foreground sm:text-lg">
                {about.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <ArrowLink href="/services" className="mt-9">
                See what we handle
              </ArrowLink>
            </Reveal>
            <Reveal delay={0.1} className="relative lg:col-span-6">
              <div
                aria-hidden="true"
                className="bg-route-grid absolute -right-4 -bottom-4 h-2/3 w-2/3 rounded-media bg-orange sm:-right-6 sm:-bottom-6"
              />
              <div className="relative aspect-[4/3] overflow-hidden rounded-media border border-white/10 shadow-lift">
                <Image
                  src="/images/general/truck-sunset-highway.jpg"
                  alt={intro.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover object-[40%_50%]"
                />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Mission and vision */}
      <section aria-label="Mission and vision" className="section-b">
        <Container>
          <div className="grid gap-5 md:grid-cols-5">
            <Reveal className="md:col-span-3">
              <div className="flex h-full flex-col justify-between gap-10 rounded-panel bg-orange p-8 text-ink sm:p-10">
                <h2 className="label-caps">{mission.label}</h2>
                <p className="font-display text-2xl leading-snug font-medium tracking-[-0.02em] text-balance sm:text-3xl">
                  {mission.text}
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08} className="md:col-span-2">
              <div className="bg-ember flex h-full flex-col justify-between gap-10 rounded-panel border border-white/10 p-8 sm:p-10">
                <h2 className="label-caps text-orange">{vision.label}</h2>
                <p className="font-display text-xl leading-snug font-medium tracking-[-0.02em] text-white sm:text-2xl">
                  {vision.text}
                </p>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Values */}
      <section aria-labelledby="values-title" className="border-t border-border section-y">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-4">
              <SectionHeading
                id="values-title"
                eyebrow={values.eyebrow}
                title={values.title}
                description={values.description}
              />
            </Reveal>
            <ol className="grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:col-span-8">
              {values.items.map((item, index) => (
                <li key={item.title} className="border-t border-orange/50 pt-6 pb-8">
                  <Reveal delay={index * 0.05}>
                    <span className="font-display text-sm font-semibold tracking-[0.2em] text-orange">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                      {item.title}
                    </h3>
                    <p className="mt-2 leading-relaxed text-subtle-foreground">
                      {item.description}
                    </p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* Audience */}
      <section aria-labelledby="audience-title" className="border-y border-border bg-ink-warm/60">
        <Container className="py-16 sm:py-20">
          <Reveal>
            <SectionHeading id="audience-title" eyebrow={audience.eyebrow} title={audience.title} />
          </Reveal>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-panel border border-white/10 bg-white/10 md:grid-cols-3">
            {audience.items.map((item, index) => (
              <li key={item.title} className="bg-ink-warm p-7 sm:p-8">
                <Reveal delay={index * 0.06}>
                  <span aria-hidden="true" className="block h-px w-10 bg-orange" />
                  <h3 className="mt-6 text-xl font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-subtle-foreground">
                    {item.description}
                  </p>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <CtaSection headingId="about-cta-title" title={cta.title} description={cta.description} />
    </>
  );
}
