import {
  ChevronRight,
  ClipboardList,
  Handshake,
  SearchCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { landingSectionIds } from "@/config/navigation";
import { process } from "@/content/landing";
import { processSteps } from "@/content/process";

/** One icon per step, in the same order as `processSteps`. */
const icons: LucideIcon[] = [ClipboardList, SearchCheck, Handshake, Truck];

/**
 * Four onboarding steps as cards. Each has an icon and its step number, and on
 * large screens a chevron points from one card to the next, so the order is
 * clear without a connecting line.
 */
export function ProcessSection() {
  return (
    <section
      id={landingSectionIds.howItWorks}
      aria-labelledby="process-title"
      className="bg-ember relative overflow-hidden section-y"
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="process-title"
            eyebrow={process.eyebrow}
            title={process.title}
            description={process.description}
          />
        </Reveal>

        <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {processSteps.map((step, index) => {
            const Icon = icons[index] ?? Truck;
            const last = index === processSteps.length - 1;
            return (
              <li key={step.title} className="relative">
                <Reveal delay={index * 0.08} className="h-full">
                  <div className="h-full rounded-2xl border border-white/10 bg-ink/50 p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-orange text-ink">
                        <Icon className="size-6" aria-hidden="true" />
                      </span>
                      <span className="font-display text-3xl font-light text-white/30">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold tracking-tight">
                      <span className="sr-only">Step {index + 1}: </span>
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-subtle-foreground">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
                {last ? null : (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 -right-[1.35rem] z-10 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full bg-orange text-ink lg:inline-flex"
                  >
                    <ChevronRight className="size-4" />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
