import { parseBody, respondToServiceResult, silentSuccess } from "@/lib/api-response";
import { submitContactMessage } from "@/services/lead.service";
import { contactSchema } from "@/validations";

export const runtime = "nodejs";

/** POST /api/contact: general message (lead type CONTACT) from the Contact form. */
export async function POST(request: Request) {
  const parsed = await parseBody(request, contactSchema);
  if ("response" in parsed) return parsed.response;

  if (parsed.data.website) return silentSuccess();

  const result = await submitContactMessage(parsed.data);
  return respondToServiceResult(result, "Thanks! Your message has been sent.");
}
