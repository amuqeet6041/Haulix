// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readBodyText } from "@/lib/api-response";
import {
  checkFillTime,
  checkOrigin,
  checkTurnstile,
  clientIp,
  clientUserAgent,
  hashIp,
  MIN_FILL_MS,
} from "@/lib/request-guard";

const SITE = "https://www.haulix.test";

function req(headers: Record<string, string>, url = "http://localhost:3000/api/leads"): Request {
  return new Request(url, { method: "POST", headers });
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_ENABLED", "");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("checkOrigin", () => {
  it("allows the request's own origin and the configured site URL", () => {
    expect(checkOrigin(req({ origin: "http://localhost:3000" }), SITE)).toBeNull();
    expect(checkOrigin(req({ origin: SITE }), SITE)).toBeNull();
  });

  it("rejects other origins and the opaque 'null' origin with 403", () => {
    for (const origin of ["https://evil.test", "http://localhost:3001", "null"]) {
      expect(checkOrigin(req({ origin }), SITE)?.status).toBe(403);
    }
  });

  it("falls back to Sec-Fetch-Site, then Referer, when Origin is missing", () => {
    expect(checkOrigin(req({ "sec-fetch-site": "same-origin" }), SITE)).toBeNull();
    expect(checkOrigin(req({ "sec-fetch-site": "cross-site" }), SITE)?.status).toBe(403);
    expect(checkOrigin(req({ referer: `${SITE}/contact` }), SITE)).toBeNull();
    expect(checkOrigin(req({ referer: "https://evil.test/x" }), SITE)?.status).toBe(403);
  });

  it("rejects a request with no origin information at all (scripts, curl)", () => {
    expect(checkOrigin(req({}), SITE)?.status).toBe(403);
  });
});

describe("checkFillTime", () => {
  it("accepts a realistic fill time", () => {
    expect(checkFillTime(req({ "X-Form-Elapsed-Ms": "4200" }))).toBeNull();
    expect(checkFillTime(req({ "X-Form-Elapsed-Ms": String(MIN_FILL_MS) }))).toBeNull();
  });

  it("asks to resend (400) when too fast, missing or malformed", async () => {
    const cases: Record<string, string>[] = [
      { "X-Form-Elapsed-Ms": "200" },
      {},
      { "X-Form-Elapsed-Ms": "abc" },
      { "X-Form-Elapsed-Ms": "-5" },
    ];
    for (const headers of cases) {
      const response = checkFillTime(req(headers));
      expect(response?.status).toBe(400);
      await expect(response?.json()).resolves.toMatchObject({ ok: false });
    }
  });

  it("keeps the threshold low enough for fast humans", () => {
    expect(MIN_FILL_MS).toBeLessThanOrEqual(2000);
  });
});

describe("readBodyText", () => {
  it("returns the body when within the limit", async () => {
    const request = new Request("http://x/", { method: "POST", body: "hello" });
    await expect(readBodyText(request, 10)).resolves.toBe("hello");
  });

  it("refuses an oversized declared Content-Length without reading", async () => {
    const request = new Request("http://x/", {
      method: "POST",
      headers: { "content-length": "999999" },
      body: "small",
    });
    await expect(readBodyText(request, 1024)).resolves.toBeNull();
  });

  it("stops reading a stream that exceeds the limit even without Content-Length", async () => {
    const chunk = new TextEncoder().encode("x".repeat(1000));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 50; i++) controller.enqueue(chunk);
        controller.close();
      },
    });
    const request = new Request("http://x/", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readBodyText(request, 16 * 1024)).resolves.toBeNull();
  });

  it("counts bytes, not characters", async () => {
    const request = new Request("http://x/", { method: "POST", body: "é".repeat(6) }); // 12 bytes
    await expect(readBodyText(request, 10)).resolves.toBeNull();
  });
});

describe("client identity", () => {
  it("uses the first forwarded IP, then x-real-ip", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(req({}))).toBeUndefined();
  });

  it("hashes IPs with a keyed hash and never returns the IP", () => {
    vi.stubEnv("IP_HASH_SECRET", "secret-one");
    const a = hashIp("203.0.113.7");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp("203.0.113.7")).toBe(a);
    expect(hashIp("203.0.113.8")).not.toBe(a);
    vi.stubEnv("IP_HASH_SECRET", "secret-two");
    expect(hashIp("203.0.113.7")).not.toBe(a);
    expect(hashIp(undefined)).toBeUndefined();
  });

  it("truncates the User-Agent to the column size", () => {
    expect(clientUserAgent(req({ "user-agent": "x".repeat(900) }))).toHaveLength(500);
  });
});

describe("checkTurnstile", () => {
  const fetchMock = vi.fn();

  function enable() {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key");
  }

  afterEach(() => fetchMock.mockReset());

  it("does nothing when disabled (the default)", async () => {
    await expect(checkTurnstile(req({}), fetchMock)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stays disabled when the flag is set without a site key", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_ENABLED", "true");
    await expect(checkTurnstile(req({}), fetchMock)).resolves.toBeNull();
  });

  it("accepts a token Cloudflare verifies", async () => {
    enable();
    fetchMock.mockResolvedValue(Response.json({ success: true }));
    const result = await checkTurnstile(
      req({ "X-Turnstile-Token": "tok", "x-forwarded-for": "203.0.113.7" }),
      fetchMock,
    );
    expect(result).toBeNull();
    const body = (fetchMock.mock.calls[0]![1] as RequestInit).body as URLSearchParams;
    expect(body.get("secret")).toBe("secret-key");
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("203.0.113.7");
  });

  it("rejects a missing or failed token with 403", async () => {
    enable();
    expect((await checkTurnstile(req({}), fetchMock))?.status).toBe(403);
    fetchMock.mockResolvedValue(Response.json({ success: false }));
    expect((await checkTurnstile(req({ "X-Turnstile-Token": "bad" }), fetchMock))?.status).toBe(
      403,
    );
    fetchMock.mockRejectedValue(new Error("network"));
    expect((await checkTurnstile(req({ "X-Turnstile-Token": "x" }), fetchMock))?.status).toBe(403);
  });

  it("fails closed when enabled without a secret key", async () => {
    enable();
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect((await checkTurnstile(req({ "X-Turnstile-Token": "tok" }), fetchMock))?.status).toBe(
      403,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
