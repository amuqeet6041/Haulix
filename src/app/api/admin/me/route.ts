import { NextResponse } from "next/server";

import { withAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";

/**
 * GET /api/admin/me: the signed-in admin's name and email, or 401/403.
 * Used by the login form to confirm admin access right after signing in.
 * Returns no session ids, tokens or other account data.
 */
export const GET = withAdmin({}, async (_request, admin) =>
  NextResponse.json({ ok: true, admin: { name: admin.name, email: admin.email } }),
);
