import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { landingSectionIds } from "@/config/navigation";
import { process } from "@/content/landing";
import { processSteps } from "@/content/process";

/** Route-style timeline: horizontal on desktop, vertical on mobile. */
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

        <ol className="relative mt-16 grid gap-10 lg:mt-20 lg:grid-cols-4 lg:gap-8">
          {/* Route line */}
          <span
            aria-hidden="true"
            className="absolute top-2 bottom-2 left-[11px] w-px bg-gradient-to-b from-orange via-orange/50 to-transparent lg:top-[11px] lg:right-0 lg:bottom-auto lg:left-0 lg:h-px lg:w-full lg:bg-gradient-to-r"
          />
          {processSteps.map((step, index) => (
            <li key={step.title} className="relative pl-12 lg:pt-14 lg:pl-0">
              <Reveal delay={index * 0.08}>
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-0 flex size-6 items-center justify-center rounded-full border border-orange bg-ink"
                >
                  <span className="size-2 rounded-full bg-orange" />
                </span>
                <p className="font-display text-xs font-semibold tracking-[0.2em] text-orange uppercase">
                  Step {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-subtle-foreground">
                  {step.description}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
