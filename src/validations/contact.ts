import { z } from "zod";

import {
  emailSchema,
  fullNameSchema,
  honeypotSchema,
  optionalText,
} from "@/lib/validations/primitives";

/** General contact message submitted from /contact. */
export const contactSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: optionalText(30),
  subject: z.string().trim().min(3, "Please add a short subject.").max(150),
  message: z.string().trim().min(10, "Please write at least 10 characters.").max(3000),
  website: honeypotSchema,
});

export type ContactData = z.output<typeof contactSchema>;
export type ContactInput = z.input<typeof contactSchema>;
