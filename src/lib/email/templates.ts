import { siteConfig } from "@/config/site";
import { inquiryTypeLabel } from "@/content/inquiry-types";
import { equipmentServices } from "@/content/services";
import type { CarrierInquiryData, ContactData } from "@/validations";

/**
 * HAULIX transactional email templates.
 *
 * Email clients ignore stylesheets and CSS variables, so the palette below
 * repeats the site tokens from globals.css as inline hex values, and layout
 * uses tables with a 600px max width that shrinks on phones.
 * Every user-provided value is HTML-escaped.
 */

const palette = {
  page: "#141414", // ink
  card: "#1D1614", // ink-warm
  border: "#2E1B12", // brown
  accent: "#E86416", // orange
  text: "#F3F0EB", // cream
  muted: "#D5D5D5", // gray
} as const;

const fontStack = "Inter, 'Segoe UI', Helvetica, Arial, sans-serif";

export type EmailLead =
  | {
      type: "CARRIER_INQUIRY";
      id: string;
      createdAt: Date;
      sourcePage: string | null;
      data: CarrierInquiryData;
    }
  | {
      type: "CONTACT";
      id: string;
      createdAt: Date;
      sourcePage: string | null;
      data: ContactData;
    };

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

type Field = [label: string, value: string | number | undefined | null];

const escapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape user-provided text before placing it in HTML email. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => escapeMap[char] ?? char);
}

/** Subject lines are single-line headers: collapse line breaks and cap the length. */
export function sanitizeSubject(value: string): string {
  const flat = value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return flat.length > 150 ? `${flat.slice(0, 147)}...` : flat;
}

function present(value: Field[1]): value is string | number {
  return value !== undefined && value !== null && value !== "";
}

export function equipmentName(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  const name = equipmentServices.find((service) => service.slug === slug)?.name ?? slug;
  return name.replace(" Dispatch", "");
}

function trucks(count: number | undefined): string | undefined {
  if (count === undefined) return undefined;
  return `${count} ${count === 1 ? "truck" : "trucks"}`;
}

/** "Nov 17, 2026, 7:58 PM UTC". UTC because no business time zone is documented. */
export function formatSubmittedAt(date: Date): string {
  return `${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date)} UTC`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/** Public site URL, only when a real (non-localhost) domain is configured. */
function publicSiteUrl(): string | undefined {
  const url = siteConfig.url;
  return /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url) ? undefined : url;
}

function fieldRows(fields: Field[]): string {
  return fields
    .filter(([, value]) => present(value))
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 16px 8px 0;vertical-align:top;color:${palette.muted};font-size:13px;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:8px 0;vertical-align:top;color:${palette.text};font-size:14px;font-weight:600;word-break:break-word">${escapeHtml(String(value))}</td></tr>`,
    )
    .join("");
}

function fieldTable(fields: Field[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid ${palette.border}">${fieldRows(fields)}</table>`;
}

function fieldText(fields: Field[]): string {
  return fields
    .filter(([, value]) => present(value))
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

function messageBlock(label: string, message: string | undefined): string {
  if (!message) return "";
  return `<p style="margin:24px 0 8px;color:${palette.muted};font-size:13px">${escapeHtml(label)}</p><div style="padding:16px;border-radius:12px;background:${palette.page};border:1px solid ${palette.border};color:${palette.text};font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word">${escapeHtml(message)}</div>`;
}

function footerHtml(): string {
  const parts: string[] = [];
  const site = publicSiteUrl();
  if (site) {
    parts.push(
      `<a href="${escapeHtml(site)}" style="color:${palette.accent};text-decoration:none">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a>`,
    );
  }
  const { email, phone } = siteConfig.contact;
  if (phone) parts.push(escapeHtml(phone));
  if (email) parts.push(escapeHtml(email));
  return parts.join(" &nbsp;|&nbsp; ");
}

function footerText(): string {
  const { email, phone } = siteConfig.contact;
  return [publicSiteUrl(), phone, email].filter(Boolean).join(" | ");
}

/** Shared dark HAULIX layout: wordmark, orange rule, content card, footer. */
function layout({
  preheader,
  eyebrow,
  heading,
  content,
}: {
  preheader: string;
  eyebrow: string;
  heading: string;
  content: string;
}): string {
  const footer = footerHtml();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${palette.page};color:${palette.text};font-family:${fontStack}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${palette.page}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="padding:0 4px 20px;font-size:20px;font-weight:800;letter-spacing:0.08em;color:${palette.text}">HAULIX <span style="color:${palette.accent}">LOGISTICS</span></td></tr>
<tr><td style="height:3px;background:${palette.accent};border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:32px 28px;background:${palette.card};border:1px solid ${palette.border};border-top:0;border-radius:0 0 16px 16px">
<p style="margin:0 0 8px;color:${palette.accent};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase">${escapeHtml(eyebrow)}</p>
<h1 style="margin:0 0 20px;color:${palette.text};font-size:24px;line-height:1.25;font-weight:700">${escapeHtml(heading)}</h1>
${content}
</td></tr>
${footer ? `<tr><td style="padding:20px 4px 0;color:${palette.muted};font-size:12px;line-height:1.6">${footer}</td></tr>` : ""}
</table>
</td></tr>
</table>
</body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;color:${palette.text};font-size:15px;line-height:1.6">${escapeHtml(text)}</p>`;
}

// ---------------------------------------------------------------------------
// Business notifications (to CONTACT_EMAIL)
// ---------------------------------------------------------------------------

/**
 * Business notifications carry no Reply-To header (an own-domain From with an outside Reply-To
 * is a common spam signal), so the email offers an explicit one-click reply to the customer.
 */
function replyHref(lead: EmailLead): string {
  const subject =
    lead.type === "CARRIER_INQUIRY"
      ? "Your HAULIX Logistics dispatch inquiry"
      : "Re: your message to HAULIX Logistics";
  return `mailto:${encodeURIComponent(lead.data.email)}?subject=${encodeURIComponent(subject)}`;
}

function replyButton(lead: EmailLead): string {
  const name = escapeHtml(firstName(lead.data.fullName));
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0"><tr><td style="border-radius:10px;background:${palette.accent}"><a href="${escapeHtml(replyHref(lead))}" style="display:inline-block;padding:12px 22px;color:${palette.page};font-size:14px;font-weight:700;text-decoration:none">Reply to ${name}</a></td></tr></table><p style="margin:12px 0 0;color:${palette.muted};font-size:13px">Replying to this email would go to the HAULIX inbox, not the customer. Use the button or write to ${escapeHtml(lead.data.email)}.</p>`;
}

function replyText(lead: EmailLead): string {
  return `Reply to ${firstName(lead.data.fullName)}: ${lead.data.email}\n(Replying to this email goes to the HAULIX inbox, not the customer.)`;
}

function trackingFields(lead: EmailLead): Field[] {
  return [
    ["Submitted", formatSubmittedAt(lead.createdAt)],
    ["Source page", lead.sourcePage],
    ["Lead ID", lead.id],
  ];
}

export function businessNotificationEmail(lead: EmailLead): EmailContent {
  if (lead.type === "CARRIER_INQUIRY") {
    const d = lead.data;
    const equipment = equipmentName(d.equipment);
    const fields: Field[] = [
      ["Full name", d.fullName],
      ["Email", d.email],
      ["Phone", d.phone],
      ["Company", d.companyName],
      ["MC number", d.mcNumber],
      ["DOT number", d.dotNumber],
      ["Equipment", equipment],
      ["Fleet size", trucks(d.fleetSize)],
      ["Preferred lanes", d.preferredLanes],
    ];
    const subject = sanitizeSubject(
      `New carrier inquiry: ${d.fullName} (${equipment}, ${trucks(d.fleetSize)})`,
    );
    return {
      subject,
      html: layout({
        preheader: `${d.fullName} submitted a carrier inquiry.`,
        eyebrow: "Carrier inquiry",
        heading: `New carrier inquiry from ${d.fullName}`,
        content: `${fieldTable(fields)}${messageBlock("Message", d.message)}<div style="height:24px"></div>${fieldTable(trackingFields(lead))}${replyButton(lead)}`,
      }),
      text: [
        "New carrier inquiry",
        "",
        fieldText(fields),
        ...(d.message ? ["", `Message:\n${d.message}`] : []),
        "",
        fieldText(trackingFields(lead)),
        "",
        replyText(lead),
      ].join("\n"),
    };
  }

  const d = lead.data;
  const topic = inquiryTypeLabel(d.inquiryType);
  const fields: Field[] = [
    ["Full name", d.fullName],
    ["Email", d.email],
    ["Phone", d.phone],
    ["Company", d.companyName],
    ["Inquiry type", topic],
    ["Subject", d.subject],
    ["Equipment", equipmentName(d.equipment)],
    ["Fleet size", trucks(d.fleetSize)],
  ];
  return {
    subject: sanitizeSubject(`New contact message: ${topic} from ${d.fullName}`),
    html: layout({
      preheader: `${d.fullName} sent a message through the contact form.`,
      eyebrow: "Contact message",
      heading: d.subject ? d.subject : `${topic} from ${d.fullName}`,
      content: `${fieldTable(fields)}${messageBlock("Message", d.message)}<div style="height:24px"></div>${fieldTable(trackingFields(lead))}${replyButton(lead)}`,
    }),
    text: [
      "New contact message",
      "",
      fieldText(fields),
      "",
      `Message:\n${d.message}`,
      "",
      fieldText(trackingFields(lead)),
      "",
      replyText(lead),
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Customer confirmations (to the person who submitted the form)
// ---------------------------------------------------------------------------

export interface ConfirmationOptions {
  /** True when replies reach the HAULIX inbox (CONTACT_EMAIL is set as reply-to). */
  canReply: boolean;
}

/**
 * Confirmation sent to the visitor. Contains only what they submitted, never
 * the lead id, IP hash or other internal data, and promises no response time.
 */
export function customerConfirmationEmail(
  lead: EmailLead,
  { canReply }: ConfirmationOptions,
): EmailContent {
  const name = firstName(lead.data.fullName);
  const replyLine = canReply
    ? "If you would like to add anything, just reply to this email."
    : "If you would like to add anything, you can send us another message through our website.";
  const signOff = "The HAULIX Logistics team";

  if (lead.type === "CARRIER_INQUIRY") {
    const d = lead.data;
    const summary: Field[] = [
      ["Equipment", equipmentName(d.equipment)],
      ["Fleet size", trucks(d.fleetSize)],
      ["Company", d.companyName],
      ["Preferred lanes", d.preferredLanes],
    ];
    const intro = `Thanks for reaching out to HAULIX Logistics. We received your carrier inquiry, and a member of our dispatch team will review it and contact you using the details you provided.`;
    return {
      subject: "We received your carrier inquiry",
      html: layout({
        preheader: "Thanks for your carrier inquiry. Our dispatch team will review it.",
        eyebrow: "Carrier inquiry received",
        heading: `Thanks, ${name}. We have your inquiry.`,
        content: `${paragraph(intro)}<p style="margin:24px 0 8px;color:${palette.muted};font-size:13px">What you told us</p>${fieldTable(summary)}<div style="height:20px"></div>${paragraph(replyLine)}${paragraph(signOff)}`,
      }),
      text: [
        `Hi ${name},`,
        "",
        intro,
        "",
        "What you told us:",
        fieldText(summary),
        "",
        replyLine,
        "",
        signOff,
        footerText(),
      ]
        .join("\n")
        .trimEnd(),
    };
  }

  const d = lead.data;
  const summary: Field[] = [
    ["Topic", inquiryTypeLabel(d.inquiryType)],
    ["Subject", d.subject],
  ];
  const intro = `Thanks for contacting HAULIX Logistics. We received your message, and someone from our team will read it and get back to you.`;
  return {
    subject: "We received your message",
    html: layout({
      preheader: "Thanks for contacting HAULIX Logistics. We received your message.",
      eyebrow: "Message received",
      heading: `Thanks, ${name}. We got your message.`,
      content: `${paragraph(intro)}${fieldTable(summary)}${messageBlock("Your message", d.message)}<div style="height:20px"></div>${paragraph(replyLine)}${paragraph(signOff)}`,
    }),
    text: [
      `Hi ${name},`,
      "",
      intro,
      "",
      fieldText(summary),
      "",
      "Your message:",
      d.message,
      "",
      replyLine,
      "",
      signOff,
      footerText(),
    ]
      .join("\n")
      .trimEnd(),
  };
}
