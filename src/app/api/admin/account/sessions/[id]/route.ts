import {
  adminError,
  adminNotFound,
  adminOk,
  readRouteParam,
  type RouteContext,
} from "@/lib/admin-api";
import { withAdmin } from "@/lib/admin-guard";
import { revokeAccountSession } from "@/services/admin-account.service";
import { sessionIdSchema } from "@/validations/admin-account";

export const runtime = "nodejs";

/**
 * DELETE /api/admin/account/sessions/[id]
 * Ends one of the signed-in admin's OTHER sessions. The id is looked up in the
 * caller's own sessions, so an id belonging to someone else is a 404; the
 * current session is refused (400, use sign out). Same-origin check applies.
 */
export const DELETE = withAdmin<RouteContext<{ id: string }>>(
  {},
  async (request, admin, context) => {
    const id = await readRouteParam(context, "id", sessionIdSchema);
    if (!id.ok) return id.response;

    const result = await revokeAccountSession(admin, request.headers, id.data);
    if (result.ok) return adminOk({ ...result.data });
    if (result.reason === "not_found") return adminNotFound();
    if (result.reason === "current_session") {
      return adminError("invalid_request", {
        message: "This is the session you are using. Use Sign out to end it.",
      });
    }
    return adminError("server_error");
  },
);
