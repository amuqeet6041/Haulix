import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { ServiceResult } from "@/types/api";
import type { ContactData } from "@/validations";

import { sendContactNotification } from "./email.service";

async function storeMessage(message: ContactData): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    await getPrisma().contactMessage.create({
      data: {
        fullName: message.fullName,
        email: message.email,
        phone: message.phone ?? null,
        subject: message.subject,
        message: message.message,
      },
    });
    return true;
  } catch (error) {
    console.error("[contact] Failed to store message:", error);
    return false;
  }
}

/** Handles a validated contact message: store it and notify the team. */
export async function submitContactMessage(message: ContactData): Promise<ServiceResult> {
  const [stored, notified] = await Promise.all([
    storeMessage(message),
    sendContactNotification(message),
  ]);

  if (stored || notified) return { ok: true };

  const anythingConfigured = isDatabaseConfigured() || Boolean(process.env.RESEND_API_KEY);
  return { ok: false, reason: anythingConfigured ? "failed" : "not_configured" };
}
