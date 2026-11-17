import { Quote } from "lucide-react";

import type { Testimonial } from "@/content/testimonials";

interface TestimonialCardProps {
  testimonial: Testimonial;
}

/** Renders a real testimonial. Only used when content/testimonials.ts has entries. */
export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <figure className="flex h-full flex-col rounded-2xl border border-border bg-background p-6 shadow-soft">
      <Quote className="mb-4 size-6 text-brand-500" aria-hidden="true" />
      <blockquote className="flex-1 text-sm leading-relaxed">{testimonial.quote}</blockquote>
      <figcaption className="mt-5 text-sm">
        <span className="font-semibold text-foreground">{testimonial.name}</span>
        <span className="block text-subtle-foreground">{testimonial.role}</span>
      </figcaption>
    </figure>
  );
}
