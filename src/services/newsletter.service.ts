import { logServerError } from "@/lib/log";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { ServiceResult } from "@/types/api";
import type { NewsletterData } from "@/validations";

import { checkNewsletterRateLimit } from "./rate-limit.service";

/**
 * Stores a newsletter subscriber. Safe to call twice with the same email
 * (idempotent upsert). New sign-ups are capped globally per time window.
 */
export async function subscribeToNewsletter(
  { email }: NewsletterData,
  now: Date = new Date(),
): Promise<ServiceResult> {
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };

  try {
    const prisma = getPrisma();
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) return { ok: true };

    const limit = await checkNewsletterRateLimit(now);
    if (limit.limited) {
      return { ok: false, reason: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds };
    }

    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email },
      update: {},
    });
    return { ok: true };
  } catch (error) {
    logServerError("newsletter", "Failed to store subscriber", error);
    return { ok: false, reason: "failed" };
  }
}
