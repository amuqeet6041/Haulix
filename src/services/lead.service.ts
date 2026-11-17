import type { Prisma } from "@/generated/prisma/client";
import { logServerError } from "@/lib/log";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { ServiceResult } from "@/types/api";
import type { CarrierInquiryData, ContactData } from "@/validations";

import {
  reportNotificationOutcome,
  sendContactNotification,
  sendLeadNotification,
} from "./email.service";

/**
 * Every inbound inquiry is a row in the unified `Lead` table.
 *
 * The record builders below copy only validated visitor fields and set `type`
 * from the endpoint. Server-managed fields (status, submissionId, sourcePage,
 * ipHash, userAgent, timestamps, admin fields) are never taken from input:
 * the database defaults apply, and later steps set the rest on the server.
 */

export function toCarrierInquiryRecord(data: CarrierInquiryData): Prisma.LeadCreateInput {
  return {
    type: "CARRIER_INQUIRY",
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    companyName: data.companyName ?? null,
    mcNumber: data.mcNumber ?? null,
    dotNumber: data.dotNumber ?? null,
    equipment: data.equipment,
    fleetSize: data.fleetSize,
    preferredLanes: data.preferredLanes ?? null,
    message: data.message ?? null,
  };
}

export function toContactRecord(data: ContactData): Prisma.LeadCreateInput {
  return {
    type: "CONTACT",
    fullName: data.fullName,
    email: data.email,
    phone: data.phone ?? null,
    companyName: data.companyName ?? null,
    equipment: data.equipment ?? null,
    fleetSize: data.fleetSize ?? null,
    inquiryType: data.inquiryType,
    subject: data.subject ?? null,
    message: data.message,
  };
}

/** Stores a lead and returns its id, or null when the write failed. */
async function storeLead(record: Prisma.LeadCreateInput): Promise<string | null> {
  try {
    const created = await getPrisma().lead.create({ data: record, select: { id: true } });
    return created.id;
  } catch (error) {
    logServerError("lead", `Failed to store ${record.type} lead`, error);
    return null;
  }
}

/**
 * The database is the source of truth: a submission succeeds only once the
 * lead is stored. The team notification is sent afterwards; if it fails, the
 * stored lead is kept and the failure is logged, so nothing is lost and the
 * visitor is not asked to resubmit.
 */
async function submit(
  record: Prisma.LeadCreateInput,
  notify: () => ReturnType<typeof sendLeadNotification>,
): Promise<ServiceResult> {
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };

  const leadId = await storeLead(record);
  if (!leadId) return { ok: false, reason: "failed" };

  reportNotificationOutcome("lead", leadId, await notify());
  return { ok: true };
}

/** Handles a validated carrier inquiry from /get-started. */
export function submitCarrierInquiry(data: CarrierInquiryData): Promise<ServiceResult> {
  return submit(toCarrierInquiryRecord(data), () => sendLeadNotification(data));
}

/** Handles a validated contact message from /contact. */
export function submitContactMessage(data: ContactData): Promise<ServiceResult> {
  return submit(toContactRecord(data), () => sendContactNotification(data));
}
