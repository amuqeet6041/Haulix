import { z } from "zod";

import { inquiryTypeValues } from "@/content/inquiry-types";
import { equipmentSlugs } from "@/content/services";
import {
  emailSchema,
  fleetSizeSchema,
  fullNameSchema,
  honeypotSchema,
  leadLimits,
  optionalField,
  optionalIdNumberSchema,
  optionalText,
  optionalUsPhoneSchema,
  usPhoneSchema,
} from "@/lib/validations/primitives";

/**
 * Client input for the two lead types stored in the unified `Lead` table.
 *
 * Only fields a visitor may set are listed. Unknown keys are stripped, so a
 * client can never supply `type`, `status`, `sourcePage`, `submissionId`,
 * `ipHash`, `userAgent`, timestamps or admin fields: the server sets those.
 * The lead type comes from the endpoint (/api/leads or /api/contact).
 */

export const leadTypes = ["CARRIER_INQUIRY", "CONTACT"] as const;
export type LeadTypeValue = (typeof leadTypes)[number];

const equipmentSchema = z.enum(equipmentSlugs, { error: "Please choose your equipment type." });
const inquiryTypeSchema = z.enum(inquiryTypeValues, { error: "Please choose a topic." });

/** Fields shared by both lead types, with identical rules. */
const sharedLeadFields = {
  fullName: fullNameSchema,
  email: emailSchema,
  companyName: optionalText(leadLimits.companyName),
  website: honeypotSchema,
};

/** CARRIER_INQUIRY: submitted from /get-started. */
export const carrierInquirySchema = z.object({
  ...sharedLeadFields,
  phone: usPhoneSchema,
  mcNumber: optionalIdNumberSchema,
  dotNumber: optionalIdNumberSchema,
  equipment: equipmentSchema,
  fleetSize: fleetSizeSchema,
  preferredLanes: optionalText(leadLimits.preferredLanes),
  message: optionalText(leadLimits.carrierMessage),
});

/** CONTACT: submitted from /contact. */
export const contactSchema = z.object({
  ...sharedLeadFields,
  phone: optionalUsPhoneSchema,
  inquiryType: inquiryTypeSchema,
  subject: optionalText(leadLimits.subject),
  equipment: optionalField(equipmentSchema),
  fleetSize: optionalField(fleetSizeSchema),
  message: z
    .string({ error: "Please write a message." })
    .trim()
    .min(10, "Please write at least 10 characters.")
    .max(
      leadLimits.contactMessage,
      `Please keep this under ${leadLimits.contactMessage} characters.`,
    ),
});

/** Validated output types (after trimming and transforms). */
export type CarrierInquiryData = z.output<typeof carrierInquirySchema>;
export type ContactData = z.output<typeof contactSchema>;
/** Raw form input types (what the form fields hold before parsing). */
export type CarrierInquiryInput = z.input<typeof carrierInquirySchema>;
export type ContactInput = z.input<typeof contactSchema>;
