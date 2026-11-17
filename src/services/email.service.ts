import {
  getFromAddress,
  getMissingConfirmationConfig,
  getMissingEmailConfig,
  getNotificationRecipient,
  getResend,
} from "@/lib/email/client";
import {
  businessNotificationEmail,
  customerConfirmationEmail,
  type EmailContent,
  type EmailLead,
} from "@/lib/email/templates";
import { logServerError, logServerWarning } from "@/lib/log";
import { getPrisma } from "@/lib/prisma";

/**
 * Lead emails, sent through Resend after the lead is stored:
 * - a business notification to CONTACT_EMAIL (no reply-to; see sendBusinessNotification), and
 * - a confirmation to the visitor (reply-to: CONTACT_EMAIL when set).
 *
 * Nothing here throws. Each delivery is independent; `notifiedAt` and
 * `confirmationSentAt` are set only after Resend accepts that message.
 * Logs name the lead id and the error name/code only, never addresses or keys.
 */

export type EmailResult = "sent" | "not_configured" | "failed";

interface Message extends EmailContent {
  to: string;
  replyTo?: string;
}

async function send(kind: string, leadId: string, message: Message): Promise<EmailResult> {
  try {
    const { error } = await getResend().emails.send({
      from: getFromAddress(),
      to: message.to,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) {
      logServerError("email", `Resend rejected the ${kind} for ${leadId}`, error);
      return "failed";
    }
    return "sent";
  } catch (error) {
    logServerError("email", `Failed to send the ${kind} for ${leadId}`, error);
    return "failed";
  }
}

export async function sendBusinessNotification(lead: EmailLead): Promise<EmailResult> {
  const missing = getMissingEmailConfig();
  if (missing.length > 0) {
    logServerWarning(
      "email",
      `Notification for ${lead.id} skipped (missing ${missing.join(", ")}).`,
    );
    return "not_configured";
  }
  // No Reply-To header: a From on our domain with a Reply-To outside it is a common spam signal,
  // so the email body offers a one-click "Reply to <name>" mailto button instead. (Hostinger
  // filed early notifications in Spam; whitelist the sender in the mailbox if that recurs.)
  return send("notification", lead.id, {
    ...businessNotificationEmail(lead),
    to: getNotificationRecipient(),
  });
}

export async function sendCustomerConfirmation(lead: EmailLead): Promise<EmailResult> {
  const missing = getMissingConfirmationConfig();
  if (missing.length > 0) {
    logServerWarning(
      "email",
      `Confirmation for ${lead.id} skipped (missing ${missing.join(", ")}).`,
    );
    return "not_configured";
  }
  const inbox = getNotificationRecipient();
  return send("confirmation", lead.id, {
    ...customerConfirmationEmail(lead, { canReply: Boolean(inbox) }),
    to: lead.data.email,
    replyTo: inbox || undefined,
  });
}

/** Records a successful delivery. A failed update is logged; the email was still sent. */
async function markSent(leadId: string, field: "notifiedAt" | "confirmationSentAt"): Promise<void> {
  try {
    await getPrisma().lead.update({
      where: { id: leadId },
      data: { [field]: new Date() },
      select: { id: true },
    });
  } catch (error) {
    logServerError("email", `Sent, but could not record ${field} for ${leadId}`, error);
  }
}

/**
 * Sends both emails for a stored lead and records each successful delivery.
 * Runs after the response (see lead.service). Never throws.
 */
export async function deliverLeadEmails(lead: EmailLead): Promise<void> {
  try {
    const [notification, confirmation] = await Promise.all([
      sendBusinessNotification(lead),
      sendCustomerConfirmation(lead),
    ]);
    await Promise.all([
      notification === "sent" ? markSent(lead.id, "notifiedAt") : undefined,
      confirmation === "sent" ? markSent(lead.id, "confirmationSentAt") : undefined,
    ]);
  } catch (error) {
    logServerError("email", `Unexpected error delivering emails for ${lead.id}`, error);
  }
}
