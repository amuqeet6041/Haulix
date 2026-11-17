/**
 * Server-side logging helpers for form submissions.
 *
 * Provider errors (Prisma, Resend) can echo submitted values such as names or
 * email addresses in their messages, so only the error's name and code are
 * logged, never its message or the raw object.
 */

export function describeError(error: unknown): string {
  if (!error || typeof error !== "object") return "UnknownError";

  const { name, code, statusCode } = error as {
    name?: unknown;
    code?: unknown;
    statusCode?: unknown;
  };
  const parts = [typeof name === "string" && name ? name : "Error"];
  if (typeof code === "string" || typeof code === "number") parts.push(`code=${code}`);
  if (typeof statusCode === "number") parts.push(`status=${statusCode}`);
  return parts.join(" ");
}

/** Logs a failure as `[scope] action: ErrorName code=...` with no personal data. */
export function logServerError(scope: string, action: string, error?: unknown): void {
  const detail = error === undefined ? "" : `: ${describeError(error)}`;
  console.error(`[${scope}] ${action}${detail}`);
}

/** Logs a non-fatal problem (for example a skipped notification). */
export function logServerWarning(scope: string, message: string): void {
  console.warn(`[${scope}] ${message}`);
}
