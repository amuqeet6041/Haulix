import { FileCheck2, Handshake, Truck, Users, type LucideIcon } from "lucide-react";

import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { trustHighlights } from "@/content/landing";

/** One icon per highlight, in the same order as `trustHighlights`. */
const icons: LucideIcon[] = [Users, Truck, Handshake, FileCheck2];

/** Credibility highlights under the hero. Factual service descriptions only, no statistics. */
export function TrustStrip() {
  return (
    <section aria-label="Why carriers choose HAULIX" className="bg-ink-warm/60 py-12 sm:py-16">
      <Container>
        <ul className="grid gap-9 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {trustHighlights.map((item, index) => {
            const Icon = icons[index] ?? Truck;
            return (
              <li key={item.title}>
                <Reveal delay={index * 0.05} className="flex gap-4">
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-orange/15 text-orange">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-display text-lg font-semibold tracking-tight text-white">
                      {item.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-subtle-foreground">
                      {item.description}
                    </p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
