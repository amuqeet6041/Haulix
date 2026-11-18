// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { config, proxy } from "@/proxy";

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

describe("proxy (extra layer only)", () => {
  it("turns away admin API requests without a session cookie with 401", async () => {
    const response = proxy(request("/api/admin/leads"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "unauthenticated" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("lets requests with a session cookie through to the real guard, marked no-store and noindex", () => {
    for (const cookie of [
      "haulix.session_token=abc.def",
      "__Secure-haulix.session_token=abc.def",
    ]) {
      const response = proxy(request("/api/admin/leads", cookie));
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
    }
  });

  it("redirects admin pages without a session cookie to the login page", () => {
    for (const path of ["/admin", "/admin/leads", "/admin/settings/x"]) {
      const response = proxy(request(path));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin/login");
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    }
  });

  it("always lets the login page through, marked no-store and noindex", () => {
    const response = proxy(request("/admin/login"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("ignores other apps' cookies", () => {
    expect(proxy(request("/admin", "better-auth.session_token=abc")).status).toBe(307);
    expect(proxy(request("/api/admin/me", "better-auth.session_token=abc")).status).toBe(401);
  });

  it("only matches the admin area, never public pages, public APIs or /portal", () => {
    expect(config.matcher).toEqual(["/admin", "/admin/:path*", "/api/admin/:path*"]);
    for (const pattern of config.matcher) {
      expect(pattern).not.toMatch(/portal|contact|leads$|newsletter|^\/api\/auth/);
    }
  });
});
