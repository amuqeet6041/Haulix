import { Resend } from "resend";

/**
 * Resend configuration. Server-only: none of these variables has the
 * NEXT_PUBLIC_ prefix, so they are never bundled for the browser.
 *
 * - RESEND_API_KEY  API key.
 * - FROM_EMAIL      Sender, e.g. "HAULIX Logistics <dispatch@your-domain.com>". Must use a
 *                   domain verified in Resend. EMAIL_FROM is still read as a fallback for
 *                   older .env files.
 * - CONTACT_EMAIL   HAULIX inbox that receives lead notifications; also the reply-to address
 *                   on customer confirmations.
 *
 * Business notifications need all three. Customer confirmations need the key and sender.
 * Missing configuration only skips email; it never blocks saving a lead.
 */

let cachedClient: Resend | null = null;

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/** Sender address, or "" when not configured. No hard-coded fallback. */
export function getFromAddress(): string {
  return env("FROM_EMAIL") || env("EMAIL_FROM");
}

/** Inbox that receives lead notifications, or "" when not configured. */
export function getNotificationRecipient(): string {
  return env("CONTACT_EMAIL");
}

/** Names (never values) of the variables a business notification still needs. */
export function getMissingEmailConfig(): string[] {
  const missing: string[] = [];
  if (!env("RESEND_API_KEY")) missing.push("RESEND_API_KEY");
  if (!getFromAddress()) missing.push("FROM_EMAIL");
  if (!getNotificationRecipient()) missing.push("CONTACT_EMAIL");
  return missing;
}

/** Names of the variables a customer confirmation still needs (CONTACT_EMAIL is optional). */
export function getMissingConfirmationConfig(): string[] {
  return getMissingEmailConfig().filter((name) => name !== "CONTACT_EMAIL");
}

/** True only when business notifications can be sent. */
export function isEmailConfigured(): boolean {
  return getMissingEmailConfig().length === 0;
}

/** Lazily creates the Resend client. Throws if RESEND_API_KEY is missing. */
export function getResend(): Resend {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }
  cachedClient ??= new Resend(apiKey);
  return cachedClient;
}
