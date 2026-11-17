import { inquiryTypeLabel } from "@/content/inquiry-types";
import { equipmentServices } from "@/content/services";
import type { CarrierInquiryData, ContactData } from "@/validations";

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

type Field = [label: string, value: string | number | undefined];

function row(label: string, value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  return `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${escapeHtml(label)}</td><td style="padding:4px 0"><strong>${escapeHtml(String(value))}</strong></td></tr>`;
}

function textLines(fields: Field[]): string {
  return fields
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([l, v]) => `${l}: ${v}`)
    .join("\n");
}

function equipmentName(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return equipmentServices.find((service) => service.slug === slug)?.name ?? slug;
}

export function leadNotificationEmail(lead: CarrierInquiryData): {
  subject: string;
  html: string;
  text: string;
} {
  const fields: Field[] = [
    ["Name", lead.fullName],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Company", lead.companyName],
    ["MC number", lead.mcNumber],
    ["DOT number", lead.dotNumber],
    ["Equipment", equipmentName(lead.equipment)],
    ["Fleet size", lead.fleetSize],
    ["Preferred lanes", lead.preferredLanes],
    ["Message", lead.message],
  ];

  return {
    subject: `New carrier inquiry: ${lead.fullName}`,
    html: `<h2>New carrier inquiry</h2><table>${fields.map(([l, v]) => row(l, v)).join("")}</table>`,
    text: textLines(fields),
  };
}

export function contactNotificationEmail(message: ContactData): {
  subject: string;
  html: string;
  text: string;
} {
  const topic = inquiryTypeLabel(message.inquiryType);
  const fields: Field[] = [
    ["Name", message.fullName],
    ["Email", message.email],
    ["Phone", message.phone],
    ["Company", message.companyName],
    ["Topic", topic],
    ["Subject", message.subject],
    ["Equipment", equipmentName(message.equipment)],
    ["Fleet size", message.fleetSize],
  ];

  return {
    subject: `Website contact: ${message.subject ?? topic}`,
    html: `<h2>New contact message</h2><table>${fields.map(([l, v]) => row(l, v)).join("")}</table><p style="white-space:pre-wrap">${escapeHtml(message.message)}</p>`,
    text: `${textLines(fields)}\n\n${message.message}`,
  };
}
