/** Field-level validation messages keyed by field name. */
export type FieldErrors = Record<string, string[]>;

/** Shape of every JSON response returned by the public API routes. */
export type ApiResponse =
  | { ok: true; message: string }
  | {
      ok: false;
      message: string;
      /** Field-level errors keyed by field name, when validation failed. */
      fieldErrors?: FieldErrors;
    };

/** Outcome returned by the application services to the API routes. */
export type ServiceResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "failed" }
  | { ok: false; reason: "rate_limited"; retryAfterSeconds: number };
