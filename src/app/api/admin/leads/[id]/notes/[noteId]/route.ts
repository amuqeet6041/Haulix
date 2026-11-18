import {
  adminOk,
  adminServiceError,
  parseJson,
  readRouteParam,
  type RouteContext,
} from "@/lib/admin-api";
import { withAdmin } from "@/lib/admin-guard";
import { revalidateLeadPages } from "@/lib/admin-revalidate";
import { deleteNote, updateNote } from "@/services/admin-note.service";
import { leadIdSchema, leadNoteEditSchema, noteIdSchema } from "@/validations/admin-leads";

export const runtime = "nodejs";

type Context = RouteContext<{ id: string; noteId: string }>;

/**
 * PATCH /api/admin/leads/[id]/notes/[noteId]   body: { body, expectedUpdatedAt? }
 * Edits a note. Needs `leadNote:update`, and the note must be the signed-in
 * admin's own (403 otherwise, including legacy notes). The note must belong to
 * the lead in the URL (404 otherwise). 409 if it changed since it was loaded.
 */
export const PATCH = withAdmin<Context>(
  { leadNote: ["update"] },
  async (request, admin, context) => {
    const id = await readRouteParam(context, "id", leadIdSchema);
    if (!id.ok) return id.response;
    const noteId = await readRouteParam(context, "noteId", noteIdSchema);
    if (!noteId.ok) return noteId.response;
    const body = await parseJson(request, leadNoteEditSchema);
    if (!body.ok) return body.response;

    const result = await updateNote(admin, id.data, noteId.data, body.data);
    if (!result.ok) return adminServiceError(result.reason);

    if (result.data.changed) revalidateLeadPages();
    return adminOk({ ...result.data });
  },
);

/**
 * DELETE /api/admin/leads/[id]/notes/[noteId]
 * Deletes one note. Same ownership and lead-match rules as editing; needs
 * `leadNote:delete`.
 */
export const DELETE = withAdmin<Context>(
  { leadNote: ["delete"] },
  async (_request, admin, context) => {
    const id = await readRouteParam(context, "id", leadIdSchema);
    if (!id.ok) return id.response;
    const noteId = await readRouteParam(context, "noteId", noteIdSchema);
    if (!noteId.ok) return noteId.response;

    const result = await deleteNote(admin, id.data, noteId.data);
    if (!result.ok) return adminServiceError(result.reason);

    revalidateLeadPages();
    return adminOk({ ...result.data });
  },
);
