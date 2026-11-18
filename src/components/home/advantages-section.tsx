import { Clock, Headset, SlidersHorizontal, Truck, type LucideIcon } from "lucide-react";

import { Container } from "@/components/shared/container";
import { PrimaryButton } from "@/components/shared/primary-button";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { advantages } from "@/content/landing";

/** One icon per advantage, in the same order as `advantages.items`. */
const icons: LucideIcon[] = [SlidersHorizontal, Truck, Headset, Clock];

export function AdvantagesSection() {
  return (
    <section aria-labelledby="why-title" className="section-y">
      <Container>
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <Reveal className="lg:sticky lg:top-28">
              <SectionHeading
                id="why-title"
                eyebrow={advantages.eyebrow}
                title={advantages.title}
                description={advantages.description}
              />
              <PrimaryButton href="/get-started" size="xl" className="mt-9 px-8">
                Work with HAULIX
              </PrimaryButton>
            </Reveal>
          </div>

          <ul className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
            {advantages.items.map((item, index) => {
              const Icon = icons[index] ?? Truck;
              return (
                <li key={item.title}>
                  <Reveal delay={index * 0.05} className="h-full">
                    <div className="group h-full rounded-2xl card-surface p-6 transition-colors duration-300 hover:border-card-border-hover sm:p-7">
                      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-orange/15 text-orange transition-colors duration-300 group-hover:bg-orange group-hover:text-ink">
                        <Icon className="size-6" aria-hidden="true" />
                      </span>
                      <h3 className="mt-5 text-xl font-semibold tracking-tight">{item.title}</h3>
                      <p className="mt-2 leading-relaxed text-subtle-foreground">
                        {item.description}
                      </p>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </section>
  );
}
