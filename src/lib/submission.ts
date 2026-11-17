import { z } from "zod";

import { equipmentSlugs, type EquipmentSlug } from "@/content/services";
import { leadLimits } from "@/lib/validations/primitives";

/**
 * Submission metadata that is NOT part of the visitor's form data.
 *
 * - `sourcePage` is derived on the server from the request's `Referer`
 *   header, only for same-origin pages, as a bare path (query strings and
 *   fragments are dropped because they can carry personal data).
 * - `submissionId` is an idempotency key the form generates once per
 *   submission attempt and sends in the `Idempotency-Key` header. Retrying
 *   the same attempt (a lost response, a double click) reuses it, so the
 *   unique `Lead.submissionId` column stores the lead only once. It is only
 *   accepted as a UUID; anything else is ignored and the database default
 *   is used. A client can only ever collide with its own key.
 *
 * Neither value is accepted in the JSON body: the Zod lead schemas strip them.
 */

export const SUBMISSION_ID_HEADER = "Idempotency-Key";

export interface SubmissionMeta {
  sourcePage?: string;
  submissionId?: string;
}

const uuidSchema = z.uuid();

/** Same-origin page path from a Referer value, or undefined. */
export function sourcePageFromReferer(
  referer: string | null,
  allowedOrigins: readonly string[],
): string | undefined {
  if (!referer) return undefined;

  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return undefined;
  }
  if (!allowedOrigins.includes(url.origin)) return undefined;

  const path = url.pathname;
  if (!path.startsWith("/") || path.startsWith("/api/")) return undefined;
  return path.length <= leadLimits.sourcePage ? path : undefined;
}

/** Reads the server-side submission metadata from a request. Never throws. */
export function readSubmissionMeta(request: Request, siteUrl?: string): SubmissionMeta {
  const origins: string[] = [];
  try {
    origins.push(new URL(request.url).origin);
  } catch {
    // Not an absolute URL: no request origin to compare against.
  }
  if (siteUrl) {
    try {
      origins.push(new URL(siteUrl).origin);
    } catch {
      // Ignore a malformed site URL.
    }
  }

  const key = request.headers.get(SUBMISSION_ID_HEADER)?.trim();
  return {
    sourcePage: sourcePageFromReferer(request.headers.get("referer"), origins),
    submissionId: key && uuidSchema.safeParse(key).success ? key.toLowerCase() : undefined,
  };
}

/** New idempotency key for a submission attempt (browser or server). */
export function newSubmissionId(): string | undefined {
  return globalThis.crypto?.randomUUID?.();
}

/** Equipment slug from a `?equipment=` query string, only if it is a known slug. */
export function equipmentFromSearch(search: string): EquipmentSlug | undefined {
  const value = new URLSearchParams(search).get("equipment")?.trim().toLowerCase();
  return equipmentSlugs.find((slug) => slug === value);
}
