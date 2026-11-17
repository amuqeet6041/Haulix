import { Resend } from "resend";

let cachedClient: Resend | null = null;

/** Variables that must all be set before notification email can be sent. */
export const REQUIRED_EMAIL_ENV = ["RESEND_API_KEY", "CONTACT_EMAIL"] as const;

/** Names (never values) of the required email variables that are missing or blank. */
export function getMissingEmailConfig(): string[] {
  return REQUIRED_EMAIL_ENV.filter((name) => !process.env[name]?.trim());
}

/** True only when every required email variable is set. */
export function isEmailConfigured(): boolean {
  return getMissingEmailConfig().length === 0;
}

/** Lazily creates the Resend client. Throws if RESEND_API_KEY is missing. */
export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }
  cachedClient ??= new Resend(apiKey);
  return cachedClient;
}

/** Inbox that receives lead and contact notifications. */
export function getNotificationRecipient(): string {
  return process.env.CONTACT_EMAIL?.trim() ?? "";
}

/**
 * Sender address. Resend only delivers from verified domains, so set
 * EMAIL_FROM once your domain is verified. The fallback is Resend's shared
 * test sender, suitable for development only.
 */
export function getFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || "HAULIX <onboarding@resend.dev>";
}
