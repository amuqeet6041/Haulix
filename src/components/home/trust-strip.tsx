import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { trustHighlights } from "@/content/landing";

/** Credibility highlights under the hero. Factual service descriptions only, no statistics. */
export function TrustStrip() {
  return (
    <section
      aria-label="Why carriers choose HAULIX"
      className="border-y border-border bg-ink-warm/60"
    >
      <Container>
        <ul className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {trustHighlights.map((item, index) => (
            <li
              key={item.title}
              className="py-7 sm:px-6 sm:py-9 sm:nth-[n+3]:border-t sm:nth-[n+3]:border-border lg:first:pl-0 lg:nth-[n+3]:border-t-0"
            >
              <Reveal delay={index * 0.05}>
                <p className="font-display text-xs font-semibold tracking-[0.2em] text-orange">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-3 font-display text-lg font-semibold tracking-tight text-white">
                  {item.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-subtle-foreground">
                  {item.description}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
