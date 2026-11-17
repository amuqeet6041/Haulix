import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import type { ApiResponse, ServiceResult } from "@/types/api";

export function jsonResponse(body: ApiResponse, status = 200): NextResponse<ApiResponse> {
  return NextResponse.json(body, { status });
}

/** Largest JSON body the public form endpoints accept (the biggest real form is about 4 KB). */
export const MAX_BODY_BYTES = 16 * 1024;

const tooLarge = () =>
  jsonResponse({ ok: false, message: "This submission is too large. Please shorten it." }, 413);

/**
 * Reads the body as text, stopping once it exceeds `maxBytes`. Checks the
 * declared Content-Length first, then counts the bytes actually streamed, so a
 * missing or false header cannot bypass the limit. Returns null when too large.
 */
export async function readBodyText(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Reads the JSON body (up to `maxBytes`) and validates it. Returns the parsed
 * data, or a ready-made error response (400, 413 or 422). Shared by every API
 * route so validation behaves identically.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
  { maxBytes = MAX_BODY_BYTES }: { maxBytes?: number } = {},
): Promise<{ data: T } | { response: NextResponse<ApiResponse> }> {
  let raw: unknown;
  try {
    const text = await readBodyText(request, maxBytes);
    if (text === null) return { response: tooLarge() };
    raw = JSON.parse(text);
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
  if (result.reason === "rate_limited") {
    const response = jsonResponse(
      {
        ok: false,
        message:
          "We received several requests from you in a short time. Please wait a few minutes and try again.",
      },
      429,
    );
    response.headers.set("Retry-After", String(result.retryAfterSeconds));
    return response;
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
