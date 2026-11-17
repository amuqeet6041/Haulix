import { logServerError } from "@/lib/log";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { ServiceResult } from "@/types/api";
import type { ContactData } from "@/validations";

import { reportNotificationOutcome, sendContactNotification } from "./email.service";

/** Stores the message and returns its id, or null when the write failed. */
async function storeMessage(message: ContactData): Promise<string | null> {
  try {
    const created = await getPrisma().contactMessage.create({
      data: {
        fullName: message.fullName,
        email: message.email,
        phone: message.phone ?? null,
        subject: message.subject,
        message: message.message,
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    logServerError("contact", "Failed to store message", error);
    return null;
  }
}

/**
 * Handles a validated contact message. Same rule as leads: it succeeds only
 * once stored; a failed notification is logged but never loses the message.
 */
export async function submitContactMessage(message: ContactData): Promise<ServiceResult> {
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };

  const messageId = await storeMessage(message);
  if (!messageId) return { ok: false, reason: "failed" };

  reportNotificationOutcome("contact", messageId, await sendContactNotification(message));
  return { ok: true };
}
