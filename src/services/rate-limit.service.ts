import { logServerError, logServerWarning } from "@/lib/log";
import { getPrisma } from "@/lib/prisma";

/**
 * PostgreSQL-backed rate limits. No extra table: leads already store `ipHash`
 * and `email` with indexes on (ipHash, createdAt) and email, so counting
 * recent rows is cheap and works across every server instance.
 *
 * Failures fail open (the submission proceeds) so a database hiccup in a
 * limit check never loses a real lead; the insert itself still has to succeed.
 */

export type RateLimitResult = { limited: false } | { limited: true; retryAfterSeconds: number };

interface Rule {
  windowMs: number;
  max: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Per client IP hash, across both lead types. */
export const IP_RULES: Rule[] = [
  { windowMs: 10 * MINUTE, max: 5 },
  { windowMs: 24 * HOUR, max: 20 },
];

/** Per email address, across both lead types. */
export const EMAIL_RULES: Rule[] = [{ windowMs: HOUR, max: 3 }];

/** Newsletter has no IP column, so it gets a global cap on new sign-ups. */
export const NEWSLETTER_RULE: Rule = { windowMs: 10 * MINUTE, max: 30 };

function retryAfter(oldest: Date | undefined, windowMs: number, now: Date): number {
  if (!oldest) return Math.ceil(windowMs / 1000);
  return Math.max(1, Math.ceil((oldest.getTime() + windowMs - now.getTime()) / 1000));
}

async function checkRules(
  rules: Rule[],
  where: { ipHash: string } | { email: string },
  now: Date,
): Promise<RateLimitResult> {
  const lead = getPrisma().lead;
  for (const rule of rules) {
    const since = new Date(now.getTime() - rule.windowMs);
    const inWindow = { ...where, createdAt: { gte: since } };
    const count = await lead.count({ where: inWindow });
    if (count >= rule.max) {
      const oldest = await lead.findFirst({
        where: inWindow,
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      return {
        limited: true,
        retryAfterSeconds: retryAfter(oldest?.createdAt, rule.windowMs, now),
      };
    }
  }
  return { limited: false };
}

export async function checkLeadRateLimit(
  { ipHash, email }: { ipHash?: string; email: string },
  now: Date = new Date(),
): Promise<RateLimitResult> {
  try {
    if (ipHash) {
      const byIp = await checkRules(IP_RULES, { ipHash }, now);
      if (byIp.limited) {
        logServerWarning("rate-limit", "Lead submission limited by client IP.");
        return byIp;
      }
    }
    const byEmail = await checkRules(EMAIL_RULES, { email }, now);
    if (byEmail.limited) logServerWarning("rate-limit", "Lead submission limited by email.");
    return byEmail;
  } catch (error) {
    logServerError("rate-limit", "Lead rate limit check failed; allowing the submission", error);
    return { limited: false };
  }
}

export async function checkNewsletterRateLimit(now: Date = new Date()): Promise<RateLimitResult> {
  try {
    const since = new Date(now.getTime() - NEWSLETTER_RULE.windowMs);
    const count = await getPrisma().newsletterSubscriber.count({
      where: { createdAt: { gte: since } },
    });
    if (count < NEWSLETTER_RULE.max) return { limited: false };
    logServerWarning("rate-limit", "Newsletter sign-ups limited (global cap).");
    return { limited: true, retryAfterSeconds: Math.ceil(NEWSLETTER_RULE.windowMs / 1000) };
  } catch (error) {
    logServerError("rate-limit", "Newsletter rate limit check failed; allowing the sign-up", error);
    return { limited: false };
  }
}
