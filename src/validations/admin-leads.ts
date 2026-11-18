import { z } from "zod";

import { leadStatusValues, leadTypeValues } from "@/content/lead-status";

/**
 * Input rules for the admin lead endpoints and pages.
 *
 * The list query exists twice on purpose:
 *   - `leadListQuerySchema` (API): a bad value is a 422 with field errors.
 *   - `leadListPageQuerySchema` (pages): a bad value quietly falls back to
 *     its default, so a mangled bookmark still renders the list.
 */

export const LEAD_PAGE_SIZES = [10, 25, 50] as const;
export const DEFAULT_LEAD_PAGE_SIZE = 25;
export const MAX_LEAD_PAGE = 10_000;
export const LEAD_SEARCH_MAX = 100;
export const LEAD_SORT_FIELDS = ["createdAt", "fullName", "status", "type"] as const;
export const NOTE_BODY_MAX = 5000;

export type LeadPageSize = (typeof LEAD_PAGE_SIZES)[number];
export type LeadSortField = (typeof LEAD_SORT_FIELDS)[number];
export type SortDirection = "asc" | "desc";

/** Query strings send "" for a cleared control; treat it as not provided. */
const blankAsUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const pageSchema = z.coerce
  .number({ error: "Page must be a number." })
  .int("Page must be a whole number.")
  .min(1, "Page must be 1 or more.")
  .max(MAX_LEAD_PAGE, "Page is too large.");

const pageSizeSchema = z.coerce
  .number({ error: "Page size must be a number." })
  .refine(
    (value): value is LeadPageSize => (LEAD_PAGE_SIZES as readonly number[]).includes(value),
    {
      error: `Page size must be one of ${LEAD_PAGE_SIZES.join(", ")}.`,
    },
  )
  .transform((value) => value as LeadPageSize);

const typeSchema = z.enum(leadTypeValues, { error: "Unknown lead type." });
const statusSchema = z.enum(leadStatusValues, { error: "Unknown lead status." });

const searchSchema = z
  .string()
  .trim()
  .max(LEAD_SEARCH_MAX, `Search must be ${LEAD_SEARCH_MAX} characters or fewer.`)
  .transform((value) => value || undefined);

const sortSchema = z.enum(LEAD_SORT_FIELDS, { error: "Unknown sort field." });
const dirSchema = z.enum(["asc", "desc"], { error: "Sort direction must be asc or desc." });

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(blankAsUndefined, schema.optional());

/** Strict list query for GET /api/admin/leads. */
export const leadListQuerySchema = z.object({
  page: z.preprocess(blankAsUndefined, pageSchema.default(1)),
  pageSize: z.preprocess(blankAsUndefined, pageSizeSchema.default(DEFAULT_LEAD_PAGE_SIZE)),
  type: optional(typeSchema),
  status: optional(statusSchema),
  q: optional(searchSchema),
  sort: z.preprocess(blankAsUndefined, sortSchema.default("createdAt")),
  dir: z.preprocess(blankAsUndefined, dirSchema.default("desc")),
});

/** Lenient list query for the /admin/leads page: invalid values fall back to defaults. */
export const leadListPageQuerySchema = z.object({
  page: z.preprocess(blankAsUndefined, pageSchema.default(1)).catch(1),
  pageSize: z
    .preprocess(blankAsUndefined, pageSizeSchema.default(DEFAULT_LEAD_PAGE_SIZE))
    .catch(DEFAULT_LEAD_PAGE_SIZE),
  type: optional(typeSchema).catch(undefined),
  status: optional(statusSchema).catch(undefined),
  // An over-long search is cut, not dropped, so the box keeps what was typed.
  q: z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim().slice(0, LEAD_SEARCH_MAX) : value),
      optional(searchSchema),
    )
    .catch(undefined),
  sort: z.preprocess(blankAsUndefined, sortSchema.default("createdAt")).catch("createdAt"),
  dir: z.preprocess(blankAsUndefined, dirSchema.default("desc")).catch("desc"),
});

export type LeadListQuery = z.output<typeof leadListQuerySchema>;

/** Lead ids are Prisma cuids. Anything else is rejected before touching the database. */
export const leadIdSchema = z.cuid({ error: "Invalid lead id." });
export const noteIdSchema = z.cuid({ error: "Invalid note id." });

/**
 * PATCH /api/admin/leads/[id]/status. `expectedStatus` is the status the admin
 * saw; if the lead changed since, the update is refused with 409.
 */
export const leadStatusUpdateSchema = z.strictObject({
  status: statusSchema,
  expectedStatus: statusSchema.optional(),
});

export type LeadStatusUpdate = z.output<typeof leadStatusUpdateSchema>;

/** Body for creating or editing a note. */
export const leadNoteSchema = z.strictObject({
  body: z
    .string({ error: "Please write a note." })
    .trim()
    .min(1, "Please write a note.")
    .max(NOTE_BODY_MAX, `Please keep notes under ${NOTE_BODY_MAX} characters.`),
});

export type LeadNoteInput = z.output<typeof leadNoteSchema>;

/**
 * Editing a note. `expectedUpdatedAt` is the note's `updatedAt` as the admin
 * saw it; if the note changed since, the edit is refused with 409 instead of
 * silently overwriting.
 */
export const leadNoteEditSchema = z.strictObject({
  body: leadNoteSchema.shape.body,
  expectedUpdatedAt: z.iso.datetime({ error: "Invalid timestamp." }).optional(),
});

export type LeadNoteEdit = z.output<typeof leadNoteEditSchema>;

/** Reads URLSearchParams (or Next's searchParams object) into a plain record, first value wins. */
export function searchParamsToRecord(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): Record<string, string> {
  const record: Record<string, string> = {};
  if (params instanceof URLSearchParams) {
    for (const [key, value] of params) if (!(key in record)) record[key] = value;
    return record;
  }
  for (const [key, value] of Object.entries(params)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) record[key] = first;
  }
  return record;
}
