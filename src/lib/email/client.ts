import { Resend } from "resend";

let cachedClient: Resend | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_EMAIL);
}

/** Lazily creates the Resend client. Throws if RESEND_API_KEY is missing. */
export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }
  cachedClient ??= new Resend(apiKey);
  return cachedClient;
}

/**
 * Sender address. Resend only delivers from verified domains, so set
 * EMAIL_FROM once your domain is verified. The fallback is Resend's shared
 * test sender, suitable for development only.
 */
export function getFromAddress(): string {
  return process.env.EMAIL_FROM || "HAULIX <onboarding@resend.dev>";
}
