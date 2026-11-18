import type {
  InquiryType,
  LeadActivityAction,
  LeadStatus,
  LeadType,
} from "@/generated/prisma/enums";
import type { FieldErrors } from "@/types/api";

/**
 * Shapes the admin API returns and the admin UI renders. Dates are ISO
 * strings because these travel as JSON. Server-only columns (ipHash,
 * userAgent, submissionId) are never part of them.
 */

/** Admin attribution shown on notes and activity. Null when the account is gone or for imported notes. */
export interface AdminActor {
  id: string;
  name: string;
}

/** One row of the leads table. */
export interface AdminLeadSummary {
  id: string;
  type: LeadType;
  status: LeadStatus;
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  equipment: string | null;
  fleetSize: number | null;
  inquiryType: InquiryType | null;
  createdAt: string;
  updatedAt: string;
}

/** Everything the lead detail page shows. */
export interface AdminLeadDetail extends AdminLeadSummary {
  mcNumber: string | null;
  dotNumber: string | null;
  preferredLanes: string | null;
  subject: string | null;
  message: string | null;
  sourcePage: string | null;
  notifiedAt: string | null;
  confirmationSentAt: string | null;
  contactedAt: string | null;
  notes: AdminLeadNote[];
  activity: AdminLeadActivity[];
}

export interface AdminLeadNote {
  id: string;
  body: string;
  author: AdminActor | null;
  createdAt: string;
  updatedAt: string;
  /** True when the signed-in admin wrote it (and so may edit or delete it). */
  canEdit: boolean;
}

export interface AdminLeadActivity {
  id: string;
  action: LeadActivityAction;
  actor: AdminActor | null;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
  noteId: string | null;
  createdAt: string;
}

export interface LeadListResult {
  leads: AdminLeadSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DashboardStats {
  /** Every lead in every status, including REJECTED and SPAM. */
  totalLeads: number;
  /** Count for each status; statuses with no leads are 0, never missing. */
  byStatus: Record<LeadStatus, number>;
  /** Count for each lead type; types with no leads are 0, never missing. */
  byType: Record<LeadType, number>;
  /** Newest leads first, capped at RECENT_LEADS_LIMIT. */
  recentLeads: AdminLeadSummary[];
}

/**
 * Outcome of an admin service call. Like `ServiceResult` for the public forms,
 * but carrying data on success and a `not_found` reason. Authorization failures
 * are not part of it: services throw `AdminAccessError` (see admin-guard.ts),
 * which `withAdmin()` turns into a 401 or 403.
 */
export type AdminServiceResult<T> =
  { ok: true; data: T } | { ok: false; reason: "not_configured" | "not_found" | "failed" };

/** Envelope for successful admin API responses. */
export type AdminApiSuccess<T> = { ok: true } & T;

/** Envelope for failed admin API responses. */
export interface AdminApiError {
  ok: false;
  code: AdminErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
}

export type AdminErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "unavailable"
  | "invalid_request"
  | "too_large"
  | "validation_failed"
  | "not_found"
  | "conflict"
  | "server_error";

export type AdminApiResponse<T> = AdminApiSuccess<T> | AdminApiError;
