/**
 * Customer testimonials.
 *
 * Intentionally EMPTY. Only add real testimonials with the customer's
 * permission. Pages render an empty state while this list is empty.
 */

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
}

export const testimonials: Testimonial[] = [];
