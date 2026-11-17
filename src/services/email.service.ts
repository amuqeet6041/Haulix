import {
  getFromAddress,
  getMissingEmailConfig,
  getNotificationRecipient,
  getResend,
} from "@/lib/email/client";
import { contactNotificationEmail, leadNotificationEmail } from "@/lib/email/templates";
import { logServerError, logServerWarning } from "@/lib/log";
import type { ContactData, LeadData } from "@/validations";

/**
 * Sends internal notification emails through Resend.
 * Never throws, so callers can decide how to degrade.
 */

/** Outcome of a notification attempt. */
export type NotificationResult = "sent" | "not_configured" | "failed";

interface EmailPayload {
  subject: string;
  html: string;
  text: string;
  replyTo: string;
}

async function send(payload: EmailPayload): Promise<NotificationResult> {
  if (getMissingEmailConfig().length > 0) return "not_configured";

  try {
    const { error } = await getResend().emails.send({
      from: getFromAddress(),
      to: getNotificationRecipient(),
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    if (error) {
      logServerError("email", "Resend rejected the notification", error);
      return "failed";
    }
    return "sent";
  } catch (error) {
    logServerError("email", "Failed to send the notification", error);
    return "failed";
  }
}

/**
 * Logs a notification that did not go out for a record that IS stored, so the
 * team can follow up from the database. Logs the record id only, no personal data.
 */
export function reportNotificationOutcome(
  scope: string,
  recordId: string,
  result: NotificationResult,
): void {
  if (result === "sent") return;
  if (result === "not_configured") {
    logServerWarning(
      scope,
      `Stored ${recordId}; notification skipped (missing ${getMissingEmailConfig().join(", ")}).`,
    );
    return;
  }
  logServerWarning(scope, `Stored ${recordId}; notification email failed.`);
}

export function sendLeadNotification(lead: LeadData): Promise<NotificationResult> {
  return send({ ...leadNotificationEmail(lead), replyTo: lead.email });
}

export function sendContactNotification(message: ContactData): Promise<NotificationResult> {
  return send({ ...contactNotificationEmail(message), replyTo: message.email });
}
