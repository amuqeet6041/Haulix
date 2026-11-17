/**
 * Cloudflare Turnstile feature flag. Disabled by default.
 *
 * Turnstile is on only when ALL of these are set:
 *   NEXT_PUBLIC_TURNSTILE_ENABLED=true
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>   (public, used by the widget)
 *   TURNSTILE_SECRET_KEY=<secret key>           (server only, used to verify tokens)
 *
 * The NEXT_PUBLIC_ values are inlined at build time, so the browser and the
 * server always agree on whether a token is required.
 */

export const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function getTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

/** True when the widget should render and tokens are required. */
export function isTurnstileEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_TURNSTILE_ENABLED?.trim() === "true" && Boolean(getTurnstileSiteKey())
  );
}
