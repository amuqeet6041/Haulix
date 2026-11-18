// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/auth/[...all]/route";

const mocks = vi.hoisted(() => ({ handler: vi.fn() }));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({ GET: mocks.handler, POST: mocks.handler }),
}));
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({}),
  isAuthConfigured: () => Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET),
}));

function request(method: "GET" | "POST") {
  return new Request("http://localhost:3000/api/auth/get-session", {
    method,
    headers: { Origin: "http://localhost:3000" },
  });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  mocks.handler.mockReset();
});

describe("/api/auth route", () => {
  it("answers 503 without calling Better Auth when auth is not configured", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    for (const [handler, method] of [
      [GET, "GET"],
      [POST, "POST"],
    ] as const) {
      const response = await handler(request(method));
      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    }
    expect(mocks.handler).not.toHaveBeenCalled();
  });

  it("marks Better Auth responses no-store and noindex", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(40));
    mocks.handler.mockResolvedValue(Response.json({ session: null }));

    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("turns a database failure into an uncached 503 without leaking details", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(40));
    mocks.handler.mockRejectedValue(new Error('The table "RateLimit" does not exist'));

    const response = await POST(request("POST"));
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(JSON.stringify(await response.json())).not.toContain("RateLimit");
  });
});
