import {
  adminOk,
  adminServiceError,
  parseJson,
  readRouteParam,
  type RouteContext,
} from "@/lib/admin-api";
import { withAdmin } from "@/lib/admin-guard";
import { revalidateLeadPages } from "@/lib/admin-revalidate";
import { updateLeadStatus } from "@/services/admin-lead.service";
import { leadIdSchema, leadStatusUpdateSchema } from "@/validations/admin-leads";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/leads/[id]/status   body: { status, expectedStatus? }
 * Changes a lead's status. Admin only, needs `lead:update-status`, and
 * `withAdmin` applies the same-origin check to this state-changing method.
 * 404 for a malformed or unknown id, 422 for a bad body, 409 if someone else
 * changed the lead first. Responses carry safe fields only.
 */
export const PATCH = withAdmin<RouteContext<{ id: string }>>(
  { lead: ["update-status"] },
  async (request, admin, context) => {
    const id = await readRouteParam(context, "id", leadIdSchema);
    if (!id.ok) return id.response;
    const body = await parseJson(request, leadStatusUpdateSchema);
    if (!body.ok) return body.response;

    const result = await updateLeadStatus(admin, id.data, body.data);
    if (!result.ok) return adminServiceError(result.reason);

    if (result.data.changed) revalidateLeadPages();
    return adminOk({ ...result.data });
  },
);
