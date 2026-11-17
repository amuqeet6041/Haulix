import { parseBody, respondToServiceResult, silentSuccess } from "@/lib/api-response";
import { submitCarrierInquiry } from "@/services/lead.service";
import { carrierInquirySchema } from "@/validations";

export const runtime = "nodejs";

/** POST /api/leads: carrier inquiry (lead type CARRIER_INQUIRY) from the Get Started form. */
export async function POST(request: Request) {
  const parsed = await parseBody(request, carrierInquirySchema);
  if ("response" in parsed) return parsed.response;

  if (parsed.data.website) return silentSuccess();

  const result = await submitCarrierInquiry(parsed.data);
  return respondToServiceResult(result, "Thanks! We received your inquiry and will be in touch.");
}
