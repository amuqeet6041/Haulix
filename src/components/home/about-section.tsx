import Image from "next/image";

import { ArrowLink } from "@/components/shared/arrow-link";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { landingSectionIds } from "@/config/navigation";
import { about } from "@/content/landing";

export function AboutSection() {
  return (
    <section id={landingSectionIds.about} aria-labelledby="about-title" className="section-y">
      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-12">
          <Reveal className="relative lg:col-span-6">
            <div
              aria-hidden="true"
              className="absolute -top-5 -left-5 size-28 rounded-3xl bg-orange/90 sm:size-36"
            />
            <div className="relative aspect-[5/4] overflow-hidden rounded-media border border-white/10 shadow-lift">
              <Image
                src="/images/general/truck-sunset-highway.jpg"
                alt={about.imageAlt}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover object-[35%_50%]"
              />
            </div>
            <div className="bg-ember relative -mt-14 ml-auto w-[min(19rem,88%)] rounded-2xl border border-white/10 p-5 shadow-lift sm:-mr-6 lg:absolute lg:-right-8 lg:-bottom-10 lg:mt-0">
              <p className="label-caps text-orange">{about.audienceCard.label}</p>
              <ul className="mt-3 space-y-2">
                {about.audienceCard.items.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium text-white">
                    <span aria-hidden="true" className="h-px w-4 bg-orange" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-6 lg:pl-10">
            <SectionHeading id="about-title" eyebrow={about.eyebrow} title={about.title} />
            <div className="mt-6 space-y-4 text-base leading-relaxed text-subtle-foreground sm:text-lg">
              {about.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <dl className="mt-10 grid gap-6 sm:grid-cols-2">
              {about.pillars.map((pillar) => (
                <div key={pillar.title} className="border-t border-orange/60 pt-5">
                  <dt className="font-display text-lg font-semibold text-white">{pillar.title}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-subtle-foreground">
                    {pillar.description}
                  </dd>
                </div>
              ))}
            </dl>
            <ArrowLink href={`#${landingSectionIds.services}`} className="mt-10">
              Explore our services
            </ArrowLink>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
