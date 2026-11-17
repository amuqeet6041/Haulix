import { getFromAddress, getResend, isEmailConfigured } from "@/lib/email/client";
import { contactNotificationEmail, leadNotificationEmail } from "@/lib/email/templates";
import type { ContactData, LeadData } from "@/validations";

/**
 * Sends internal notification emails through Resend.
 * Returns false (never throws) so callers can decide how to degrade.
 */

interface EmailPayload {
  subject: string;
  html: string;
  text: string;
  replyTo: string;
}

async function send(payload: EmailPayload): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  try {
    const { error } = await getResend().emails.send({
      from: getFromAddress(),
      to: process.env.CONTACT_EMAIL as string,
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    if (error) {
      console.error("[email] Resend rejected the message:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] Failed to send:", error);
    return false;
  }
}

export function sendLeadNotification(lead: LeadData): Promise<boolean> {
  return send({ ...leadNotificationEmail(lead), replyTo: lead.email });
}

export function sendContactNotification(message: ContactData): Promise<boolean> {
  return send({ ...contactNotificationEmail(message), replyTo: message.email });
}
