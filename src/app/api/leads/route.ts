import { parseBody, respondToServiceResult, silentSuccess } from "@/lib/api-response";
import { submitLead } from "@/services/lead.service";
import { leadSchema } from "@/validations";

export const runtime = "nodejs";

/** POST /api/leads: carrier inquiry from the Get Started form. */
export async function POST(request: Request) {
  const parsed = await parseBody(request, leadSchema);
  if ("response" in parsed) return parsed.response;

  if (parsed.data.website) return silentSuccess();

  const result = await submitLead(parsed.data);
  return respondToServiceResult(result, "Thanks! We received your inquiry and will be in touch.");
}
