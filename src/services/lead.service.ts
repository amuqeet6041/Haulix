import type { Prisma } from "@/generated/prisma/client";
import { logServerError, logServerWarning } from "@/lib/log";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { SubmissionMeta } from "@/lib/submission";
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
 * The record builders copy only validated visitor fields, set `type` from the
 * endpoint, and add server-derived metadata (`sourcePage`, `submissionId`, see
 * `lib/submission.ts`). `status`, timestamps and admin fields are never taken
 * from input: the database defaults apply.
 */

function metaFields(meta: SubmissionMeta) {
  return {
    sourcePage: meta.sourcePage ?? null,
    // Omitted when absent so the database generates one.
    ...(meta.submissionId ? { submissionId: meta.submissionId } : {}),
  };
}

export function toCarrierInquiryRecord(
  data: CarrierInquiryData,
  meta: SubmissionMeta = {},
): Prisma.LeadCreateInput {
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
    ...metaFields(meta),
  };
}

export function toContactRecord(
  data: ContactData,
  meta: SubmissionMeta = {},
): Prisma.LeadCreateInput {
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
    ...metaFields(meta),
  };
}

type StoreResult =
  { status: "stored"; id: string } | { status: "duplicate" } | { status: "failed" };

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && (error as { code?: unknown }).code === "P2002",
  );
}

/**
 * Stores a lead. A unique violation on an existing `submissionId` means this
 * exact submission was already stored (a retry), which is reported as a
 * duplicate rather than a failure.
 */
async function storeLead(record: Prisma.LeadCreateInput): Promise<StoreResult> {
  const prisma = getPrisma();
  try {
    const created = await prisma.lead.create({ data: record, select: { id: true } });
    return { status: "stored", id: created.id };
  } catch (error) {
    if (record.submissionId && isUniqueViolation(error)) {
      const existing = await prisma.lead
        .findUnique({ where: { submissionId: record.submissionId }, select: { id: true } })
        .catch(() => null);
      if (existing) {
        logServerWarning("lead", `Duplicate submission ignored; already stored as ${existing.id}.`);
        return { status: "duplicate" };
      }
    }
    logServerError("lead", `Failed to store ${record.type} lead`, error);
    return { status: "failed" };
  }
}

/**
 * The database is the source of truth: a submission succeeds only once the
 * lead is stored. The team notification is sent afterwards; if it fails, the
 * stored lead is kept and the failure is logged, so nothing is lost and the
 * visitor is not asked to resubmit. A duplicate (retried) submission succeeds
 * without storing or notifying again.
 */
async function submit(
  record: Prisma.LeadCreateInput,
  notify: () => ReturnType<typeof sendLeadNotification>,
): Promise<ServiceResult> {
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };

  const stored = await storeLead(record);
  if (stored.status === "failed") return { ok: false, reason: "failed" };
  if (stored.status === "duplicate") return { ok: true };

  reportNotificationOutcome("lead", stored.id, await notify());
  return { ok: true };
}

/** Handles a validated carrier inquiry from /get-started. */
export function submitCarrierInquiry(
  data: CarrierInquiryData,
  meta: SubmissionMeta = {},
): Promise<ServiceResult> {
  return submit(toCarrierInquiryRecord(data, meta), () => sendLeadNotification(data));
}

/** Handles a validated contact message from /contact. */
export function submitContactMessage(
  data: ContactData,
  meta: SubmissionMeta = {},
): Promise<ServiceResult> {
  return submit(toContactRecord(data, meta), () => sendContactNotification(data));
}
