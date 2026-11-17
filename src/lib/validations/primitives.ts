import { z } from "zod";

/** Reusable Zod building blocks shared by every form schema. */

/**
 * Maximum lengths for stored lead fields. The VarChar sizes in
 * prisma/schema.prisma use the same numbers; change both together.
 */
export const leadLimits = {
  fullName: 100,
  email: 254,
  phone: 30,
  companyName: 150,
  preferredLanes: 300,
  subject: 150,
  carrierMessage: 2000,
  contactMessage: 3000,
  fleetSize: 500,
  sourcePage: 500,
} as const;

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Please enter your full name.")
  .max(leadLimits.fullName, "Name is too long.");

export const emailSchema = z
  .email("Please enter a valid email address.")
  .trim()
  .toLowerCase()
  .max(leadLimits.email, "Email is too long.");

function isUsPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

const phoneMessage = "Please enter a valid US phone number.";

/** US phone number: accepts common formats and requires 10 digits (optional leading 1). */
export const usPhoneSchema = z
  .string()
  .trim()
  .max(leadLimits.phone, phoneMessage)
  .refine(isUsPhone, phoneMessage);

/** Optional US phone number: empty becomes undefined, anything else must be valid. */
export const optionalUsPhoneSchema = z
  .string()
  .trim()
  .max(leadLimits.phone, phoneMessage)
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || isUsPhone(value), phoneMessage);

/** Optional free-text field: empty string becomes undefined. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .optional()
    .transform((value) => (value ? value : undefined));
}

/** Optional numeric identifier (MC/DOT numbers): digits only, 5-10 long. */
export const optionalIdNumberSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || /^\d{5,10}$/.test(value), "Use digits only (5-10).");

/** Number of trucks: a whole number from 1 to the fleet size limit. */
export const fleetSizeSchema = z
  .number({ error: "Enter how many trucks you operate." })
  .int("Use a whole number.")
  .min(1, "You need at least one truck.")
  .max(leadLimits.fleetSize, "Please contact us directly for fleets this large.");

/**
 * Turns the "no value" shapes that form controls produce (empty string from a
 * select, NaN from an empty number input, null) into undefined, so the
 * wrapped schema can be optional.
 */
export function optionalField<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) =>
      value === "" || value === null || (typeof value === "number" && Number.isNaN(value))
        ? undefined
        : value,
    schema.optional(),
  );
}

/**
 * Honeypot field. Real users never see or fill it, so any value means a bot.
 * The schema accepts any string on purpose: API routes check it and silently
 * drop the submission, so bots get no validation error to learn from.
 */
export const honeypotSchema = z.string().optional();
