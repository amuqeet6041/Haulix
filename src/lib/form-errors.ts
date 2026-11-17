import type { FieldErrors } from "@/types/api";

/**
 * Picks the first server message for each known form field, in the order the
 * fields are listed (so the first one can receive focus). Unknown keys,
 * including the honeypot, are ignored.
 */
export function pickFieldErrors<T extends string>(
  fieldErrors: FieldErrors,
  fields: readonly T[],
): [T, string][] {
  return fields.flatMap((field): [T, string][] => {
    const message = fieldErrors[field]?.[0];
    return message ? [[field, message]] : [];
  });
}
