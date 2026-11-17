// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postContact } from "@/app/api/contact/route";
import { POST as postLead } from "@/app/api/leads/route";
import { POST as postNewsletter } from "@/app/api/newsletter/route";

/**
 * Integration tests of the real route handlers and guards. No database is
 * configured, so a request that passes every guard ends at 503.
 */

const BASE = "http://localhost:3000";

const lead = {
  fullName: "Jane Driver",
  email: "jane@example.com",
  phone: "(555) 123-4567",
  equipment: "dry-van",
  fleetSize: 2,
};

const contact = {
  fullName: "Jane Driver",
  email: "jane@example.com",
  inquiryType: "GENERAL",
  message: "I would like to know more about dispatch.",
};

function post(path: string, body: unknown, headers: Record<string, string | null> = {}): Request {
  const merged: Record<string, string> = {};
  const defaults = {
    "Content-Type": "application/json",
    Origin: BASE,
    "X-Form-Elapsed-Ms": "6000",
  };
  for (const [key, value] of Object.entries({ ...defaults, ...headers })) {
    if (value !== null) merged[key] = value;
  }
  return new Request(BASE + path, {
    method: "POST",
    headers: merged,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_ENABLED", "");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const routes = [
  { name: "leads", handler: postLead, path: "/api/leads", body: lead },
  { name: "contact", handler: postContact, path: "/api/contact", body: contact },
  {
    name: "newsletter",
    handler: postNewsletter,
    path: "/api/newsletter",
    body: { email: "a@b.co" },
  },
];

describe.each(routes)("POST $path", ({ handler, path, body }) => {
  it("lets a normal same-origin submission through the guards", async () => {
    expect((await handler(post(path, body))).status).toBe(503);
  });

  it("rejects another origin with 403", async () => {
    const response = await handler(post(path, body, { Origin: "https://evil.test" }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
  });

  it("rejects a request without any origin information", async () => {
    expect((await handler(post(path, body, { Origin: null }))).status).toBe(403);
  });

  it("rejects an oversized body with 413", async () => {
    const huge = { ...body, padding: "x".repeat(40 * 1024) };
    expect((await handler(post(path, huge))).status).toBe(413);
  });

  it("requires Turnstile only when enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key");
    expect((await handler(post(path, body))).status).toBe(403);
  });
});

describe("minimum fill time", () => {
  it.each([
    ["leads", postLead, "/api/leads", lead],
    ["contact", postContact, "/api/contact", contact],
  ] as const)(
    "%s: a submission sent too fast gets 400, a normal one passes",
    async (_, handler, path, body) => {
      expect((await handler(post(path, body, { "X-Form-Elapsed-Ms": "300" }))).status).toBe(400);
      expect((await handler(post(path, body, { "X-Form-Elapsed-Ms": null }))).status).toBe(400);
      expect((await handler(post(path, body))).status).toBe(503);
    },
  );

  it("is not required for the newsletter endpoint (no form yet)", async () => {
    const request = post("/api/newsletter", { email: "a@b.co" }, { "X-Form-Elapsed-Ms": null });
    expect((await postNewsletter(request)).status).toBe(503);
  });

  it("still answers a honeypot hit with a silent 200", async () => {
    const response = await postContact(
      post(
        "/api/contact",
        { ...contact, website: "http://spam.test" },
        { "X-Form-Elapsed-Ms": "10" },
      ),
    );
    expect(response.status).toBe(200);
  });
});

describe("guard order", () => {
  it("checks origin before reading the body", async () => {
    const response = await postLead(
      post("/api/leads", "{not json", { Origin: "https://evil.test" }),
    );
    expect(response.status).toBe(403);
  });

  it("validates fields (422) before the fill time check", async () => {
    const response = await postLead(
      post("/api/leads", { ...lead, phone: "1" }, { "X-Form-Elapsed-Ms": "10" }),
    );
    expect(response.status).toBe(422);
  });
});
