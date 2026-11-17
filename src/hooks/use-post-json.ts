"use client";

import { useCallback, useState } from "react";

import { SUBMISSION_ID_HEADER } from "@/lib/submission";
import type { ApiResponse, FieldErrors } from "@/types/api";

type Status = "idle" | "submitting" | "success" | "error";

interface PostJsonState {
  status: Status;
  message: string;
  fieldErrors: FieldErrors;
}

export interface SubmitOptions {
  /** Idempotency key for this submission attempt, sent as a header (see lib/submission.ts). */
  submissionId?: string;
}

/** What `submit` resolves to, so the form can react (reset, map field errors). */
export type SubmitResult = { ok: true } | { ok: false; fieldErrors: FieldErrors };

export const NETWORK_ERROR_MESSAGE =
  "We could not reach the server. Check your connection and try again.";
export const SERVER_ERROR_MESSAGE =
  "Something went wrong on our side. Please try again in a few minutes.";
export const UNEXPECTED_RESPONSE_MESSAGE = "We could not process your request. Please try again.";

const idleState: PostJsonState = { status: "idle", message: "", fieldErrors: {} };

function isApiResponse(value: unknown): value is ApiResponse {
  if (!value || typeof value !== "object") return false;
  const { ok, message } = value as { ok?: unknown; message?: unknown };
  return typeof ok === "boolean" && typeof message === "string";
}

/**
 * Reads our JSON response. Anything else (an HTML error page from the host,
 * an empty body, a proxy timeout) becomes a clear error instead of being
 * mistaken for a network failure.
 */
async function readResponse(response: Response): Promise<ApiResponse> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Not JSON: fall through to the status-based message below.
  }
  if (isApiResponse(body)) return body;

  return {
    ok: false,
    message: response.status >= 500 ? SERVER_ERROR_MESSAGE : UNEXPECTED_RESPONSE_MESSAGE,
  };
}

/** Posts JSON to one of our API routes and tracks the submit state for the form UI. */
export function usePostJson(endpoint: string) {
  const [state, setState] = useState<PostJsonState>(idleState);

  const submit = useCallback(
    async (payload: unknown, options: SubmitOptions = {}): Promise<SubmitResult> => {
      setState({ status: "submitting", message: "", fieldErrors: {} });

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (options.submissionId) headers[SUBMISSION_ID_HEADER] = options.submissionId;

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      } catch {
        setState({ status: "error", message: NETWORK_ERROR_MESSAGE, fieldErrors: {} });
        return { ok: false, fieldErrors: {} };
      }

      const body = await readResponse(response);
      if (body.ok) {
        setState({ status: "success", message: body.message, fieldErrors: {} });
        return { ok: true };
      }

      const fieldErrors = body.fieldErrors ?? {};
      setState({ status: "error", message: body.message, fieldErrors });
      return { ok: false, fieldErrors };
    },
    [endpoint],
  );

  const reset = useCallback(() => setState(idleState), []);

  return { ...state, submit, reset };
}
