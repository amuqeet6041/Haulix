import { after } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import type { EmailLead } from "@/lib/email/templates";
import { logServerError, logServerWarning } from "@/lib/log";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { SubmissionMeta } from "@/lib/submission";
import type { ServiceResult } from "@/types/api";
import type { CarrierInquiryData, ContactData } from "@/validations";

import { deliverLeadEmails } from "./email.service";
import { checkLeadRateLimit } from "./rate-limit.service";

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
    ...(meta.ipHash ? { ipHash: meta.ipHash } : {}),
    ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
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
  | { status: "stored"; id: string; createdAt: Date }
  | { status: "duplicate" }
  | { status: "failed" };

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
    const created = await prisma.lead.create({
      data: record,
      select: { id: true, createdAt: true },
    });
    return { status: "stored", id: created.id, createdAt: created.createdAt };
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

/** A resubmission with identical content inside this window counts as the same lead. */
export const CONTENT_DUPLICATE_WINDOW_MS = 10 * 60_000;

/**
 * Second layer of duplicate protection, for retries without the idempotency
 * key (a reload, a second tab): the same email, type and visitor-entered
 * content stored within the window. Fails open on a database error.
 */
async function findContentDuplicate(
  record: Prisma.LeadCreateInput,
  now: Date,
): Promise<string | null> {
  try {
    const existing = await getPrisma().lead.findFirst({
      where: {
        type: record.type,
        email: record.email,
        phone: record.phone ?? null,
        companyName: record.companyName ?? null,
        equipment: record.equipment ?? null,
        fleetSize: record.fleetSize ?? null,
        inquiryType: record.inquiryType ?? null,
        subject: record.subject ?? null,
        message: record.message ?? null,
        createdAt: { gte: new Date(now.getTime() - CONTENT_DUPLICATE_WINDOW_MS) },
      },
      select: { id: true },
    });
    return existing?.id ?? null;
  } catch (error) {
    logServerError("lead", "Duplicate check failed; continuing", error);
    return null;
  }
}

/** Runs work after the response is sent. Defaults to Next.js `after()`; tests inject their own. */
export type Scheduler = (task: () => Promise<void>) => void;

export interface SubmitOptions {
  schedule?: Scheduler;
  /** Injectable clock for tests. */
  now?: Date;
}

type LeadInput =
  { type: "CARRIER_INQUIRY"; data: CarrierInquiryData } | { type: "CONTACT"; data: ContactData };

/**
 * The database is the source of truth: a submission succeeds only once the
 * lead is stored. Emails (team notification and visitor confirmation) are
 * scheduled with `after()`, so the visitor gets the normal response without
 * waiting for Resend, and an email failure can never undo the stored lead.
 * A duplicate (retried) submission succeeds without storing or emailing again.
 *
 * Order: duplicate check first (so a retry is never rate limited), then the
 * rate limit, then the insert, which still enforces the unique submissionId.
 */
async function submit(
  input: LeadInput,
  record: Prisma.LeadCreateInput,
  { schedule = after, now = new Date() }: SubmitOptions,
): Promise<ServiceResult> {
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };

  const duplicateOf = await findContentDuplicate(record, now);
  if (duplicateOf) {
    logServerWarning("lead", `Duplicate content ignored; already stored as ${duplicateOf}.`);
    return { ok: true };
  }

  const limit = await checkLeadRateLimit(
    { ipHash: record.ipHash ?? undefined, email: record.email },
    now,
  );
  if (limit.limited) {
    return { ok: false, reason: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds };
  }

  const stored = await storeLead(record);
  if (stored.status === "failed") return { ok: false, reason: "failed" };
  if (stored.status === "duplicate") return { ok: true };

  const lead = {
    ...input,
    id: stored.id,
    createdAt: stored.createdAt,
    sourcePage: record.sourcePage ?? null,
  } as EmailLead;
  schedule(() => deliverLeadEmails(lead));
  return { ok: true };
}

/** Handles a validated carrier inquiry from /get-started. */
export function submitCarrierInquiry(
  data: CarrierInquiryData,
  meta: SubmissionMeta = {},
  options: SubmitOptions = {},
): Promise<ServiceResult> {
  return submit({ type: "CARRIER_INQUIRY", data }, toCarrierInquiryRecord(data, meta), options);
}

/** Handles a validated contact message from /contact. */
export function submitContactMessage(
  data: ContactData,
  meta: SubmissionMeta = {},
  options: SubmitOptions = {},
): Promise<ServiceResult> {
  return submit({ type: "CONTACT", data }, toContactRecord(data, meta), options);
}
