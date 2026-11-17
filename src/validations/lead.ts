import { z } from "zod";

import { equipmentSlugs } from "@/content/services";
import {
  emailSchema,
  fullNameSchema,
  honeypotSchema,
  optionalIdNumberSchema,
  optionalText,
  usPhoneSchema,
} from "@/lib/validations/primitives";

/** Carrier inquiry submitted from /get-started. */
export const leadSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: usPhoneSchema,
  companyName: optionalText(150),
  mcNumber: optionalIdNumberSchema,
  dotNumber: optionalIdNumberSchema,
  equipment: z.enum(equipmentSlugs, { error: "Please choose your equipment type." }),
  truckCount: z
    .number({ error: "Enter how many trucks you operate." })
    .int("Use a whole number.")
    .min(1, "You need at least one truck.")
    .max(500, "Please contact us directly for fleets this large."),
  preferredLanes: optionalText(300),
  message: optionalText(2000),
  website: honeypotSchema,
});

/** Validated output type (after trimming and transforms). */
export type LeadData = z.output<typeof leadSchema>;
/** Raw form input type (what the form fields hold before parsing). */
export type LeadInput = z.input<typeof leadSchema>;
