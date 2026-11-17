import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { ServiceResult } from "@/types/api";
import type { NewsletterData } from "@/validations";

/** Stores a newsletter subscriber. Safe to call twice with the same email. */
export async function subscribeToNewsletter({ email }: NewsletterData): Promise<ServiceResult> {
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };

  try {
    await getPrisma().newsletterSubscriber.upsert({
      where: { email },
      create: { email },
      update: {},
    });
    return { ok: true };
  } catch (error) {
    console.error("[newsletter] Failed to store subscriber:", error);
    return { ok: false, reason: "failed" };
  }
}
