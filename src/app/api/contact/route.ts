import { siteConfig } from "@/config/site";
import { parseBody, respondToServiceResult, silentSuccess } from "@/lib/api-response";
import {
  checkFillTime,
  checkOrigin,
  checkTurnstile,
  clientIp,
  clientUserAgent,
  hashIp,
} from "@/lib/request-guard";
import { readSubmissionMeta } from "@/lib/submission";
import { submitContactMessage } from "@/services/lead.service";
import { contactSchema } from "@/validations";

export const runtime = "nodejs";

/**
 * POST /api/contact: general message (lead type CONTACT) from the Contact form.
 * Guards, in order: same origin (403), body size (413), validation (422),
 * honeypot (silent 200), minimum fill time (400), Turnstile when enabled (403),
 * then duplicate check and rate limit (429) in the service.
 */
export async function POST(request: Request) {
  const blocked = checkOrigin(request, siteConfig.url);
  if (blocked) return blocked;

  const parsed = await parseBody(request, contactSchema);
  if ("response" in parsed) return parsed.response;

  if (parsed.data.website) return silentSuccess();

  const guarded = checkFillTime(request) ?? (await checkTurnstile(request));
  if (guarded) return guarded;

  const result = await submitContactMessage(parsed.data, {
    ...readSubmissionMeta(request, siteConfig.url),
    ipHash: hashIp(clientIp(request)),
    userAgent: clientUserAgent(request),
  });
  return respondToServiceResult(result, "Thanks! Your message has been sent.");
}
