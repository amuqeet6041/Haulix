import { Quote } from "lucide-react";

import { TestimonialCard } from "@/components/home/testimonial-card";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { testimonialsSection } from "@/content/landing";
import { testimonials } from "@/content/testimonials";

/**
 * Shows real testimonials from `content/testimonials.ts`. While that list is
 * empty (no approved testimonials yet) it renders an honest placeholder instead
 * of invented quotes.
 */
export function TestimonialsSection() {
  return (
    <section aria-labelledby="testimonials-title" className="section-b">
      <Container>
        <Reveal>
          <SectionHeading
            id="testimonials-title"
            eyebrow={testimonialsSection.eyebrow}
            title={testimonialsSection.title}
          />
        </Reveal>

        {testimonials.length > 0 ? (
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Reveal key={testimonial.id} delay={index * 0.05}>
                <TestimonialCard testimonial={testimonial} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal delay={0.05}>
            <div className="mt-12 flex flex-col gap-6 rounded-panel card-surface p-8 sm:flex-row sm:items-center sm:p-10">
              <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brown text-orange">
                <Quote className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-xl font-semibold tracking-tight">
                  {testimonialsSection.emptyTitle}
                </h3>
                <p className="mt-2 max-w-2xl leading-relaxed text-subtle-foreground">
                  {testimonialsSection.emptyDescription}
                </p>
              </div>
            </div>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
