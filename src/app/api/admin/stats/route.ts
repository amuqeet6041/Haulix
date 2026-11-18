import { adminOk, adminServiceError } from "@/lib/admin-api";
import { withAdmin } from "@/lib/admin-guard";
import { getDashboardStats } from "@/services/admin-lead.service";

export const runtime = "nodejs";

/**
 * GET /api/admin/stats
 * Lead totals by status and type, plus the newest leads. Admin only, needs
 * `lead:list`. Responses are never cached (withAdmin adds no-store).
 */
export const GET = withAdmin({ lead: ["list"] }, async (_request, admin) => {
  const result = await getDashboardStats(admin);
  if (!result.ok) return adminServiceError(result.reason);
  return adminOk({ stats: result.data });
});
