import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_PREFIX } from "@/lib/auth-constants";

/**
 * Next.js 16 Proxy (formerly middleware). An EXTRA, optimistic layer for the
 * admin area only:
 *   - /admin/login is always reachable,
 *   - other /admin pages without a session cookie redirect to /admin/login,
 *   - /api/admin requests without a session cookie get 401 JSON,
 *   - every matched response is marked no-store and noindex.
 *
 * It only checks that a session cookie exists; it does not validate it. The
 * real authorization is checkAdmin()/requireAdmin()/withAdmin()/assertAdmin()
 * in every admin page, handler and service (src/lib/admin-guard.ts,
 * src/lib/admin-page.ts), which still runs for every request this lets through.
 *
 * Public pages, public APIs and /portal are not matched.
 */

const LOGIN_PATH = "/admin/login";

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request, { cookiePrefix: AUTH_COOKIE_PREFIX }));

  if (pathname === LOGIN_PATH || hasSessionCookie) return noStore(NextResponse.next());

  if (pathname.startsWith("/api/")) {
    return noStore(
      NextResponse.json(
        { ok: false, code: "unauthenticated", message: "Please sign in to continue." },
        { status: 401 },
      ),
    );
  }
  return noStore(NextResponse.redirect(new URL(LOGIN_PATH, request.url)));
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
