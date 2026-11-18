import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { withProtectedHeaders } from "@/lib/admin-guard";
import { readBodyText } from "@/lib/api-response";
import type { AdminApiError, AdminErrorCode } from "@/types/admin";
import type { FieldErrors } from "@/types/api";
import { searchParamsToRecord } from "@/validations/admin-leads";

/**
 * Response and input helpers for the admin API routes (server only). Every
 * response is JSON with `ok`, and carries the no-store / noindex headers.
 * Use inside `withAdmin()`, which handles auth and unexpected errors.
 */

/** Admin JSON bodies are small (a note is at most 5000 characters). */
export const ADMIN_MAX_BODY_BYTES = 32 * 1024;

const STATUS_FOR: Record<AdminErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  unavailable: 503,
  invalid_request: 400,
  too_large: 413,
  validation_failed: 422,
  not_found: 404,
  conflict: 409,
  server_error: 500,
};

const DEFAULT_MESSAGE: Record<AdminErrorCode, string> = {
  unauthenticated: "Please sign in to continue.",
  forbidden: "You do not have access to this area.",
  unavailable: "This is not available right now. Please try again later.",
  invalid_request: "Invalid request.",
  too_large: "This request is too large.",
  validation_failed: "Please check the highlighted fields.",
  not_found: "We could not find that.",
  conflict: "This changed since you loaded it. Refresh and try again.",
  server_error: "Something went wrong on our side. Please try again.",
};

export function adminOk<T extends Record<string, unknown>>(body: T, status = 200) {
  return withProtectedHeaders(NextResponse.json({ ok: true as const, ...body }, { status }));
}

export function adminError(
  code: AdminErrorCode,
  { message, fieldErrors }: { message?: string; fieldErrors?: FieldErrors } = {},
): NextResponse<AdminApiError> {
  const body: AdminApiError = { ok: false, code, message: message ?? DEFAULT_MESSAGE[code] };
  if (fieldErrors) body.fieldErrors = fieldErrors;
  return withProtectedHeaders(NextResponse.json(body, { status: STATUS_FOR[code] }));
}

export const adminNotFound = (message?: string) => adminError("not_found", { message });
export const adminConflict = (message?: string) => adminError("conflict", { message });

/** Zod issues grouped by field path ("form" for top-level issues). */
export function fieldErrorsFrom(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse<AdminApiError> };

function validate<T>(schema: ZodType<T>, raw: unknown): Parsed<T> {
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    response: adminError("validation_failed", {
      fieldErrors: fieldErrorsFrom(result.error.issues),
    }),
  };
}

/** Validates the query string of `request` (or a URL). Bad values give a 422. */
export function parseQuery<T>(request: Request | URL, schema: ZodType<T>): Parsed<T> {
  const url = request instanceof URL ? request : new URL(request.url);
  return validate(schema, searchParamsToRecord(url.searchParams));
}

/** Reads and validates a JSON body: 413 when too large, 400 when not JSON, 422 when invalid. */
export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
  { maxBytes = ADMIN_MAX_BODY_BYTES }: { maxBytes?: number } = {},
): Promise<Parsed<T>> {
  let raw: unknown;
  try {
    const text = await readBodyText(request, maxBytes);
    if (text === null) return { ok: false, response: adminError("too_large") };
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      response: adminError("invalid_request", { message: "Invalid request body." }),
    };
  }
  return validate(schema, raw);
}

/** Route context in Next 16: `params` is a Promise. */
export interface RouteContext<P extends Record<string, string | string[]>> {
  params: Promise<P>;
}

/**
 * Awaits the route params and validates one of them (for example a lead id).
 * An invalid id is a 404, not a 422: to the caller it simply does not exist.
 */
export async function readRouteParam<T>(
  context: { params: Promise<Partial<Record<string, string | string[]>>> },
  name: string,
  schema: ZodType<T>,
): Promise<Parsed<T>> {
  const params = await context.params;
  const value = params[name];
  const result = schema.safeParse(Array.isArray(value) ? value[0] : value);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, response: adminNotFound() };
}
