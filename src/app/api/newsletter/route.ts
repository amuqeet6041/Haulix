import { siteConfig } from "@/config/site";
import { parseBody, respondToServiceResult, silentSuccess } from "@/lib/api-response";
import { checkOrigin, checkTurnstile } from "@/lib/request-guard";
import { subscribeToNewsletter } from "@/services/newsletter.service";
import { newsletterSchema } from "@/validations";

export const runtime = "nodejs";

/** Newsletter bodies are a single email address. */
const MAX_NEWSLETTER_BODY_BYTES = 2 * 1024;

/**
 * POST /api/newsletter: newsletter signup (no form uses it yet).
 * Guards: same origin, a small body limit, validation, honeypot, Turnstile when
 * enabled, and a global sign-up cap in the service. There is no minimum fill
 * time check because there is no form to measure yet.
 */
export async function POST(request: Request) {
  const blocked = checkOrigin(request, siteConfig.url);
  if (blocked) return blocked;

  const parsed = await parseBody(request, newsletterSchema, {
    maxBytes: MAX_NEWSLETTER_BODY_BYTES,
  });
  if ("response" in parsed) return parsed.response;

  if (parsed.data.website) return silentSuccess();

  const guarded = await checkTurnstile(request);
  if (guarded) return guarded;

  const result = await subscribeToNewsletter(parsed.data);
  return respondToServiceResult(result, "You're subscribed.");
}
