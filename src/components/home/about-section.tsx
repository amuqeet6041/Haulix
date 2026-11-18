import { Check, MessagesSquare, ShieldCheck, type LucideIcon } from "lucide-react";
import Image from "next/image";

import { ArrowLink } from "@/components/shared/arrow-link";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { landingSectionIds } from "@/config/navigation";
import { about } from "@/content/landing";

/** One icon per pillar, in the same order as `about.pillars`. */
const pillarIcons: LucideIcon[] = [ShieldCheck, MessagesSquare];

export function AboutSection() {
  return (
    <section id={landingSectionIds.about} aria-labelledby="about-title" className="section-y">
      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-12">
          <Reveal className="relative lg:col-span-6">
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
              <p className="text-sm font-semibold text-orange">{about.audienceCard.label}</p>
              <ul className="mt-3 space-y-2">
                {about.audienceCard.items.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium text-white">
                    <Check className="size-4 shrink-0 text-orange" aria-hidden="true" />
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
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {about.pillars.map((pillar, index) => {
                const Icon = pillarIcons[index] ?? ShieldCheck;
                return (
                  <li key={pillar.title} className="rounded-2xl card-surface p-5">
                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-orange/15 text-orange">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <p className="mt-4 font-display text-lg font-semibold text-white">
                      {pillar.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-subtle-foreground">
                      {pillar.description}
                    </p>
                  </li>
                );
              })}
            </ul>
            <ArrowLink href={`#${landingSectionIds.services}`} className="mt-10">
              Explore our services
            </ArrowLink>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
