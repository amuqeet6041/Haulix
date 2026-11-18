import { adminOk, adminServiceError, parseQuery } from "@/lib/admin-api";
import { withAdmin } from "@/lib/admin-guard";
import { listLeads } from "@/services/admin-lead.service";
import { leadListQuerySchema } from "@/validations/admin-leads";

export const runtime = "nodejs";

/**
 * GET /api/admin/leads?page&pageSize&type&status&q&sort&dir
 * One page of leads. Admin only, needs `lead:list`. Invalid query values are a 422.
 */
export const GET = withAdmin({ lead: ["list"] }, async (request, admin) => {
  const query = parseQuery(request, leadListQuerySchema);
  if (!query.ok) return query.response;

  const result = await listLeads(admin, query.data);
  if (!result.ok) return adminServiceError(result.reason);
  return adminOk({ ...result.data });
});
