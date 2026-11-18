import { adminError, adminOk, parseJson } from "@/lib/admin-api";
import { withAdmin } from "@/lib/admin-guard";
import { updateAccountName } from "@/services/admin-account.service";
import { accountProfileSchema } from "@/validations/admin-account";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/account/profile   body: { name }
 * Changes the signed-in admin's display name, nothing else. The body is
 * strict, so a role, email or any other field is refused with 422; the user is
 * always the caller (taken from the session, never from the request); and
 * `withAdmin` applies the same-origin check. Better Auth's update-user does the
 * write, and email changes stay disabled in its configuration.
 */
export const PATCH = withAdmin({}, async (request, admin) => {
  const body = await parseJson(request, accountProfileSchema);
  if (!body.ok) return body.response;

  const result = await updateAccountName(admin, request.headers, body.data);
  if (!result.ok) return adminError("server_error");
  return adminOk({ ...result.data });
});
