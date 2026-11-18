import { adminOk, adminServiceError, readRouteParam, type RouteContext } from "@/lib/admin-api";
import { withAdmin } from "@/lib/admin-guard";
import { getLead } from "@/services/admin-lead.service";
import { leadIdSchema } from "@/validations/admin-leads";

export const runtime = "nodejs";

/**
 * GET /api/admin/leads/[id]
 * One lead with its notes and activity. Admin only, needs `lead:read`.
 * A malformed id is a 404, the same as an id that does not exist.
 */
export const GET = withAdmin<RouteContext<{ id: string }>>(
  { lead: ["read"] },
  async (_request, admin, context) => {
    const id = await readRouteParam(context, "id", leadIdSchema);
    if (!id.ok) return id.response;

    const result = await getLead(admin, id.data);
    if (!result.ok) return adminServiceError(result.reason);
    return adminOk({ lead: result.data });
  },
);
