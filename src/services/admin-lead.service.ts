import type { Prisma } from "@/generated/prisma/client";
import { assertAdmin, type AdminContext } from "@/lib/admin-guard";
import { logServerError } from "@/lib/log";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type {
  AdminActor,
  AdminLeadActivity,
  AdminLeadDetail,
  AdminLeadNote,
  AdminLeadSummary,
  AdminServiceResult,
  LeadListResult,
} from "@/types/admin";
import type { LeadListQuery } from "@/validations/admin-leads";

/**
 * Read access to leads for the admin panel.
 *
 * Every function starts with `assertAdmin(admin, permission)`, so a service
 * can never be reached with a forged or missing context even if a route
 * forgets its guard. Authorization failures throw `AdminAccessError`;
 * everything else is returned as an `AdminServiceResult` and never throws.
 *
 * Queries use explicit `select`s: a column only reaches an admin response if
 * it is listed here. Never selected: ipHash, userAgent, submissionId, the
 * legacy `notes` column, activity `metadata` (it can hold earlier note text)
 * and anything from the User table except an author's id and name.
 */

/** Newest items first, capped so one lead can never return an unbounded page. */
export const DETAIL_NOTES_LIMIT = 200;
export const DETAIL_ACTIVITY_LIMIT = 200;

/** Columns searched by the `q` filter (case-insensitive, substring). */
export const LEAD_SEARCH_FIELDS = [
  "fullName",
  "email",
  "companyName",
  "phone",
  "mcNumber",
  "dotNumber",
  "subject",
] as const;

const summarySelect = {
  id: true,
  type: true,
  status: true,
  fullName: true,
  email: true,
  phone: true,
  companyName: true,
  equipment: true,
  fleetSize: true,
  inquiryType: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LeadSelect;

const authorSelect = { select: { id: true, name: true } } as const;

const detailSelect = {
  ...summarySelect,
  mcNumber: true,
  dotNumber: true,
  preferredLanes: true,
  subject: true,
  message: true,
  sourcePage: true,
  notifiedAt: true,
  confirmationSentAt: true,
  contactedAt: true,
  leadNotes: {
    select: {
      id: true,
      body: true,
      authorId: true,
      author: authorSelect,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: DETAIL_NOTES_LIMIT,
  },
  activities: {
    select: {
      id: true,
      action: true,
      actor: authorSelect,
      fromStatus: true,
      toStatus: true,
      noteId: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: DETAIL_ACTIVITY_LIMIT,
  },
} satisfies Prisma.LeadSelect;

type SummaryRow = Prisma.LeadGetPayload<{ select: typeof summarySelect }>;
type DetailRow = Prisma.LeadGetPayload<{ select: typeof detailSelect }>;

const iso = (date: Date) => date.toISOString();
const isoOrNull = (date: Date | null) => (date ? date.toISOString() : null);

function toSummary(row: SummaryRow): AdminLeadSummary {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    companyName: row.companyName,
    equipment: row.equipment,
    fleetSize: row.fleetSize,
    inquiryType: row.inquiryType,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

/** Copies only id and name, so nothing else on a user row can ride along. */
const toActor = (user: { id: string; name: string } | null): AdminActor | null =>
  user ? { id: user.id, name: user.name } : null;

function toDetail(row: DetailRow, admin: AdminContext): AdminLeadDetail {
  const notes: AdminLeadNote[] = row.leadNotes.map((note) => ({
    id: note.id,
    body: note.body,
    author: toActor(note.author),
    createdAt: iso(note.createdAt),
    updatedAt: iso(note.updatedAt),
    canEdit: note.authorId !== null && note.authorId === admin.userId,
  }));
  const activity: AdminLeadActivity[] = row.activities.map((entry) => ({
    id: entry.id,
    action: entry.action,
    actor: toActor(entry.actor),
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    noteId: entry.noteId,
    createdAt: iso(entry.createdAt),
  }));
  return {
    ...toSummary(row),
    mcNumber: row.mcNumber,
    dotNumber: row.dotNumber,
    preferredLanes: row.preferredLanes,
    subject: row.subject,
    message: row.message,
    sourcePage: row.sourcePage,
    notifiedAt: isoOrNull(row.notifiedAt),
    confirmationSentAt: isoOrNull(row.confirmationSentAt),
    contactedAt: isoOrNull(row.contactedAt),
    notes,
    activity,
  };
}

/**
 * Escapes the characters LIKE treats specially (`\`, `%`, `_`) so a search for
 * "50%" or "a_b" matches that text literally. Prisma's `contains` does not do
 * this itself: it sends `%value%` to ILIKE as is. PostgreSQL's default LIKE
 * escape character is the backslash, so no ESCAPE clause is needed.
 */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Builds the Prisma filter. Search terms go through Prisma's parameterized
 * `contains` (never raw SQL) after LIKE wildcards are escaped.
 */
export function buildLeadWhere({ type, status, q }: LeadListQuery): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (q) {
    const pattern = escapeLikePattern(q);
    where.OR = LEAD_SEARCH_FIELDS.map((field) => ({
      [field]: { contains: pattern, mode: "insensitive" as const },
    })) as Prisma.LeadWhereInput[];
  }
  return where;
}

/**
 * Sort by the requested column, then by id in the same direction, so rows with
 * equal values (many leads share a status or type) never move between pages.
 * `sort` and `dir` are validated against a whitelist before reaching here; the
 * switch below makes the whitelist explicit at the query too.
 */
export function buildLeadOrderBy({
  sort,
  dir,
}: Pick<LeadListQuery, "sort" | "dir">): Prisma.LeadOrderByWithRelationInput[] {
  switch (sort) {
    case "fullName":
      return [{ fullName: dir }, { id: dir }];
    case "status":
      return [{ status: dir }, { createdAt: "desc" }, { id: dir }];
    case "type":
      return [{ type: dir }, { createdAt: "desc" }, { id: dir }];
    case "createdAt":
    default:
      return [{ createdAt: dir }, { id: dir }];
  }
}

/** One page of leads. Needs the `lead:list` permission. */
export async function listLeads(
  admin: unknown,
  query: LeadListQuery,
): Promise<AdminServiceResult<LeadListResult>> {
  assertAdmin(admin, { lead: ["list"] });
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };

  try {
    const prisma = getPrisma();
    const where = buildLeadWhere(query);
    const [rows, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: buildLeadOrderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: summarySelect,
      }),
      prisma.lead.count({ where }),
    ]);
    return {
      ok: true,
      data: {
        leads: rows.map(toSummary),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  } catch (error) {
    logServerError("admin-leads", "Failed to list leads", error);
    return { ok: false, reason: "failed" };
  }
}

/** One lead with its notes and activity. Needs the `lead:read` permission. */
export async function getLead(
  admin: unknown,
  id: string,
): Promise<AdminServiceResult<AdminLeadDetail>> {
  assertAdmin(admin, { lead: ["read"] });
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };

  try {
    const row = await getPrisma().lead.findUnique({ where: { id }, select: detailSelect });
    if (!row) return { ok: false, reason: "not_found" };
    return { ok: true, data: toDetail(row, admin) };
  } catch (error) {
    logServerError("admin-leads", "Failed to load a lead", error);
    return { ok: false, reason: "failed" };
  }
}
