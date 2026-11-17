import { equipmentServices } from "@/content/services";
import type { ContactData, LeadData } from "@/validations";

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

function row(label: string, value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  return `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${escapeHtml(label)}</td><td style="padding:4px 0"><strong>${escapeHtml(String(value))}</strong></td></tr>`;
}

export function leadNotificationEmail(lead: LeadData): {
  subject: string;
  html: string;
  text: string;
} {
  const equipment =
    equipmentServices.find((service) => service.slug === lead.equipment)?.name ?? lead.equipment;

  const fields: [string, string | number | undefined][] = [
    ["Name", lead.fullName],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Company", lead.companyName],
    ["MC number", lead.mcNumber],
    ["DOT number", lead.dotNumber],
    ["Equipment", equipment],
    ["Trucks", lead.truckCount],
    ["Preferred lanes", lead.preferredLanes],
    ["Message", lead.message],
  ];

  return {
    subject: `New carrier inquiry: ${lead.fullName}`,
    html: `<h2>New carrier inquiry</h2><table>${fields.map(([l, v]) => row(l, v)).join("")}</table>`,
    text: fields
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([l, v]) => `${l}: ${v}`)
      .join("\n"),
  };
}

export function contactNotificationEmail(message: ContactData): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: `Website contact: ${message.subject}`,
    html: `<h2>New contact message</h2><table>${[
      row("Name", message.fullName),
      row("Email", message.email),
      row("Phone", message.phone),
      row("Subject", message.subject),
    ].join("")}</table><p style="white-space:pre-wrap">${escapeHtml(message.message)}</p>`,
    text: `Name: ${message.fullName}\nEmail: ${message.email}\nPhone: ${message.phone ?? ""}\nSubject: ${message.subject}\n\n${message.message}`,
  };
}
