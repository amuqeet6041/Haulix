/** Shape of every JSON response returned by the public API routes. */
export type ApiResponse =
  | { ok: true; message: string }
  | {
      ok: false;
      message: string;
      /** Field-level errors keyed by field name, when validation failed. */
      fieldErrors?: Record<string, string[]>;
    };

/** Outcome returned by the application services to the API routes. */
export type ServiceResult = { ok: true } | { ok: false; reason: "not_configured" | "failed" };
