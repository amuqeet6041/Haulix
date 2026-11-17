import { parseBody, respondToServiceResult, silentSuccess } from "@/lib/api-response";
import { subscribeToNewsletter } from "@/services/newsletter.service";
import { newsletterSchema } from "@/validations";

export const runtime = "nodejs";

/** POST /api/newsletter: newsletter signup. */
export async function POST(request: Request) {
  const parsed = await parseBody(request, newsletterSchema);
  if ("response" in parsed) return parsed.response;

  if (parsed.data.website) return silentSuccess();

  const result = await subscribeToNewsletter(parsed.data);
  return respondToServiceResult(result, "You're subscribed.");
}
