// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkLeadRateLimit,
  checkNewsletterRateLimit,
  EMAIL_RULES,
  IP_RULES,
  NEWSLETTER_RULE,
} from "@/services/rate-limit.service";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findFirst: vi.fn(),
  newsletterCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => true,
  getPrisma: () => ({
    lead: { count: mocks.count, findFirst: mocks.findFirst },
    newsletterSubscriber: { count: mocks.newsletterCount },
  }),
}));

const now = new Date("2026-11-17T22:00:00Z");
const ipHash = "a".repeat(64);
const email = "jane@example.com";

function whereOf(callIndex: number) {
  return (mocks.count.mock.calls[callIndex]![0] as { where: Record<string, unknown> }).where;
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.count.mockResolvedValue(0);
  mocks.findFirst.mockResolvedValue(null);
  mocks.newsletterCount.mockResolvedValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("checkLeadRateLimit", () => {
  it("allows a client under every limit", async () => {
    await expect(checkLeadRateLimit({ ipHash, email }, now)).resolves.toEqual({ limited: false });
    expect(mocks.count).toHaveBeenCalledTimes(IP_RULES.length + EMAIL_RULES.length);
    expect(whereOf(0)).toMatchObject({ ipHash });
    expect((whereOf(0).createdAt as { gte: Date }).gte).toEqual(
      new Date(now.getTime() - IP_RULES[0]!.windowMs),
    );
  });

  it("limits by IP hash and computes Retry-After from the oldest hit", async () => {
    mocks.count.mockResolvedValueOnce(IP_RULES[0]!.max);
    mocks.findFirst.mockResolvedValue({ createdAt: new Date(now.getTime() - 4 * 60_000) });

    const result = await checkLeadRateLimit({ ipHash, email }, now);
    // Oldest hit 4 minutes ago in a 10 minute window: retry in about 6 minutes.
    expect(result).toEqual({ limited: true, retryAfterSeconds: 360 });
  });

  it("limits by email even without an IP hash", async () => {
    mocks.count.mockResolvedValue(EMAIL_RULES[0]!.max);
    const result = await checkLeadRateLimit({ email }, now);
    expect(result.limited).toBe(true);
    expect(whereOf(0)).toMatchObject({ email });
    expect(mocks.count).toHaveBeenCalledTimes(1);
  });

  it("fails open, without logging the email, when the database errors", async () => {
    mocks.count.mockRejectedValue(new Error(`timeout for ${email}`));
    await expect(checkLeadRateLimit({ ipHash, email }, now)).resolves.toEqual({ limited: false });
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).not.toContain(email);
  });
});

describe("checkNewsletterRateLimit", () => {
  it("allows sign-ups under the global cap", async () => {
    mocks.newsletterCount.mockResolvedValue(NEWSLETTER_RULE.max - 1);
    await expect(checkNewsletterRateLimit(now)).resolves.toEqual({ limited: false });
  });

  it("limits once the cap is reached", async () => {
    mocks.newsletterCount.mockResolvedValue(NEWSLETTER_RULE.max);
    await expect(checkNewsletterRateLimit(now)).resolves.toEqual({
      limited: true,
      retryAfterSeconds: NEWSLETTER_RULE.windowMs / 1000,
    });
  });
});
