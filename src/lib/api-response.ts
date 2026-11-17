import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import type { ApiResponse, ServiceResult } from "@/types/api";

export function jsonResponse(body: ApiResponse, status = 200): NextResponse<ApiResponse> {
  return NextResponse.json(body, { status });
}

/**
 * Reads the JSON body and validates it. Returns the parsed data, or a ready-made
 * error response. Shared by every API route so validation behaves identically.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ data: T } | { response: NextResponse<ApiResponse> }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: jsonResponse({ ok: false, message: "Invalid request body." }, 400) };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      response: jsonResponse(
        { ok: false, message: "Please check the highlighted fields.", fieldErrors },
        422,
      ),
    };
  }
  return { data: result.data };
}

/** Turns a service result into the right HTTP response. */
export function respondToServiceResult(
  result: ServiceResult,
  successMessage: string,
): NextResponse<ApiResponse> {
  if (result.ok) return jsonResponse({ ok: true, message: successMessage });

  if (result.reason === "not_configured") {
    return jsonResponse(
      {
        ok: false,
        message: "This form is not available yet. Please try again later.",
      },
      503,
    );
  }
  return jsonResponse(
    { ok: false, message: "Something went wrong on our side. Please try again." },
    500,
  );
}

/** Honeypot hit: pretend success so bots learn nothing, but do no work. */
export function silentSuccess(): NextResponse<ApiResponse> {
  return jsonResponse({ ok: true, message: "Thank you." });
}
