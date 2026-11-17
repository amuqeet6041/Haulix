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
import { submitCarrierInquiry } from "@/services/lead.service";
import { carrierInquirySchema } from "@/validations";

export const runtime = "nodejs";

/**
 * POST /api/leads: carrier inquiry (lead type CARRIER_INQUIRY) from the Get Started form.
 * Same guards as /api/contact: origin, size, validation, honeypot, fill time,
 * Turnstile (when enabled), duplicate check and rate limit.
 */
export async function POST(request: Request) {
  const blocked = checkOrigin(request, siteConfig.url);
  if (blocked) return blocked;

  const parsed = await parseBody(request, carrierInquirySchema);
  if ("response" in parsed) return parsed.response;

  if (parsed.data.website) return silentSuccess();

  const guarded = checkFillTime(request) ?? (await checkTurnstile(request));
  if (guarded) return guarded;

  const result = await submitCarrierInquiry(parsed.data, {
    ...readSubmissionMeta(request, siteConfig.url),
    ipHash: hashIp(clientIp(request)),
    userAgent: clientUserAgent(request),
  });
  return respondToServiceResult(result, "Thanks! We received your inquiry and will be in touch.");
}
