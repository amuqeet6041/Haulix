import { z } from "zod";

import { emailSchema, honeypotSchema } from "@/lib/validations/primitives";

export const newsletterSchema = z.object({
  email: emailSchema,
  website: honeypotSchema,
});

export type NewsletterData = z.output<typeof newsletterSchema>;
export type NewsletterInput = z.input<typeof newsletterSchema>;
