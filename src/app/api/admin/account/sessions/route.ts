import { adminError, adminOk } from "@/lib/admin-api";
import { withAdmin } from "@/lib/admin-guard";
import { listAccountSessions } from "@/services/admin-account.service";

export const runtime = "nodejs";

/**
 * GET /api/admin/account/sessions
 * The signed-in admin's own active sessions, with a flag for the current one.
 * Safe fields only: Better Auth's own list-sessions endpoint returns session
 * tokens, so the browser never calls it; this route leaves tokens and IP
 * addresses out.
 */
export const GET = withAdmin({}, async (request, admin) => {
  const result = await listAccountSessions(admin, request.headers);
  if (!result.ok) return adminError("server_error");
  return adminOk({ sessions: result.data });
});
