import {
  adminOk,
  adminServiceError,
  parseJson,
  readRouteParam,
  type RouteContext,
} from "@/lib/admin-api";
import { withAdmin } from "@/lib/admin-guard";
import { revalidateLeadPages } from "@/lib/admin-revalidate";
import { createNote } from "@/services/admin-note.service";
import { leadIdSchema, leadNoteSchema } from "@/validations/admin-leads";

export const runtime = "nodejs";

/**
 * POST /api/admin/leads/[id]/notes   body: { body }
 * Adds an internal note by the signed-in admin. Needs `leadNote:create` and
 * the same-origin check. 201 with the note, or 200 if it was a repeat of a
 * note just added (nothing is written twice).
 */
export const POST = withAdmin<RouteContext<{ id: string }>>(
  { leadNote: ["create"] },
  async (request, admin, context) => {
    const id = await readRouteParam(context, "id", leadIdSchema);
    if (!id.ok) return id.response;
    const body = await parseJson(request, leadNoteSchema);
    if (!body.ok) return body.response;

    const result = await createNote(admin, id.data, body.data);
    if (!result.ok) return adminServiceError(result.reason);

    if (result.data.changed) revalidateLeadPages();
    return adminOk({ ...result.data }, result.data.changed ? 201 : 200);
  },
);
