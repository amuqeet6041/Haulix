import { z } from "zod";

/** Reusable Zod building blocks shared by every form schema. */

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Please enter your full name.")
  .max(100, "Name is too long.");

export const emailSchema = z
  .email("Please enter a valid email address.")
  .trim()
  .toLowerCase()
  .max(254, "Email is too long.");

/** US phone number: accepts common formats and requires 10 digits (optional leading 1). */
export const usPhoneSchema = z
  .string()
  .trim()
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
  }, "Please enter a valid US phone number.");

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

/**
 * Honeypot field. Real users never see or fill it, so any value means a bot.
 * The schema accepts any string on purpose: API routes check it and silently
 * drop the submission, so bots get no validation error to learn from.
 */
export const honeypotSchema = z.string().optional();
