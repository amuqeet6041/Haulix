import { createHmac } from "node:crypto";

import type { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { jsonResponse } from "@/lib/api-response";
import { logServerWarning } from "@/lib/log";
import { FORM_ELAPSED_HEADER, TURNSTILE_TOKEN_HEADER } from "@/lib/submission";
import { isTurnstileEnabled } from "@/lib/turnstile";
import type { ApiResponse } from "@/types/api";

/**
 * Request-level abuse checks shared by the public POST endpoints. Server only.
 * Each check returns a ready response when the request must stop, or null.
 * Messages are generic: they tell a person what to do without telling a bot
 * which rule it hit.
 */

type GuardResponse = NextResponse<ApiResponse>;

// ---------------------------------------------------------------------------
// Same-origin check
// ---------------------------------------------------------------------------

function originOf(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

/** Origins allowed to post: this request's own origin and NEXT_PUBLIC_SITE_URL. */
export function allowedOrigins(request: Request, siteUrl: string = siteConfig.url): string[] {
  return [originOf(request.url), originOf(siteUrl)].filter((o): o is string => Boolean(o));
}

/**
 * Accepts only requests sent by pages on this site. Browsers always send
 * `Origin` on a POST; when it is absent we fall back to `Sec-Fetch-Site` and
 * then `Referer`. A request with none of them (curl, scripts) is refused.
 */
export function checkOrigin(request: Request, siteUrl?: string): GuardResponse | null {
  const allowed = allowedOrigins(request, siteUrl);
  const origin = request.headers.get("origin");

  let ok: boolean;
  if (origin) {
    ok = origin !== "null" && allowed.includes(origin);
  } else {
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite) {
      ok = fetchSite === "same-origin";
    } else {
      const refererOrigin = originOf(request.headers.get("referer"));
      ok = Boolean(refererOrigin && allowed.includes(refererOrigin));
    }
  }
  if (ok) return null;

  logServerWarning("guard", "Rejected a request from another origin.");
  return jsonResponse(
    { ok: false, message: "This form can only be submitted from the HAULIX website." },
    403,
  );
}

// ---------------------------------------------------------------------------
// Minimum fill time
// ---------------------------------------------------------------------------

/**
 * Forms send how long they were open before submitting. People need several
 * seconds to fill these forms; scripts post instantly. The threshold is kept
 * low so a fast person with autofill is never blocked, and a rejection asks
 * them to try again instead of silently dropping the lead.
 */
export const MIN_FILL_MS = 1500;

export function checkFillTime(request: Request, minMs: number = MIN_FILL_MS): GuardResponse | null {
  const raw = request.headers.get(FORM_ELAPSED_HEADER);
  const elapsed = raw === null ? Number.NaN : Number(raw);
  if (Number.isFinite(elapsed) && elapsed >= minMs) return null;

  logServerWarning("guard", "Rejected a submission sent too quickly or without fill time.");
  return jsonResponse(
    { ok: false, message: "Please take a moment to review the form, then send it again." },
    400,
  );
}

// ---------------------------------------------------------------------------
// Client IP hashing and User-Agent
// ---------------------------------------------------------------------------

/**
 * Client IP from the proxy headers. On Vercel `x-forwarded-for` is set by the
 * platform; elsewhere it can be spoofed, so rate limits also key on email.
 */
export function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim();
  return ip && ip.length <= 100 ? ip : undefined;
}

let warnedAboutSecret = false;

function ipHashKey(): string {
  const secret = process.env.IP_HASH_SECRET?.trim();
  if (secret) return secret;
  if (!warnedAboutSecret) {
    warnedAboutSecret = true;
    logServerWarning(
      "guard",
      "IP_HASH_SECRET is not set; using a built-in key. Set it in production.",
    );
  }
  return "haulix-development-ip-hash-key";
}

/** Keyed SHA-256 of the IP (64 hex chars). The raw IP is never stored. */
export function hashIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  return createHmac("sha256", ipHashKey()).update(ip).digest("hex");
}

export function clientUserAgent(request: Request): string | undefined {
  const ua = request.headers.get("user-agent")?.trim();
  return ua ? ua.slice(0, 500) : undefined;
}

// ---------------------------------------------------------------------------
// Cloudflare Turnstile (disabled by default)
// ---------------------------------------------------------------------------

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * When Turnstile is enabled, verifies the token from the form with
 * Cloudflare. When disabled (the default) it does nothing. A missing secret
 * while enabled fails closed and is logged, so a misconfiguration is visible.
 */
export async function checkTurnstile(
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<GuardResponse | null> {
  if (!isTurnstileEnabled()) return null;

  const failure = () =>
    jsonResponse(
      { ok: false, message: "Please complete the verification check and try again." },
      403,
    );

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    logServerWarning("guard", "Turnstile is enabled but TURNSTILE_SECRET_KEY is missing.");
    return failure();
  }
  const token = request.headers.get(TURNSTILE_TOKEN_HEADER)?.trim();
  if (!token || token.length > 2048) return failure();

  try {
    const body = new URLSearchParams({ secret, response: token });
    const ip = clientIp(request);
    if (ip) body.set("remoteip", ip);
    const response = await fetchImpl(TURNSTILE_VERIFY_URL, { method: "POST", body });
    const result = (await response.json()) as { success?: boolean };
    if (result.success === true) return null;
    logServerWarning("guard", "Turnstile verification failed.");
  } catch {
    logServerWarning("guard", "Turnstile verification could not be completed.");
  }
  return failure();
}
