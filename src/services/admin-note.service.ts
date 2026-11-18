import { assertAdmin } from "@/lib/admin-guard";
import { logServerError } from "@/lib/log";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { noteSelect, toNote } from "@/services/admin-lead.service";
import type { AdminUpdateResult, NoteChange, NoteDeletion } from "@/types/admin";
import type { LeadNoteEdit, LeadNoteInput } from "@/validations/admin-leads";

/**
 * Internal notes on leads: add, edit, delete.
 *
 * Rules, all enforced here in the service and the database queries (the UI
 * only hides buttons):
 *   - every call starts with `assertAdmin(admin, <leadNote permission>)`;
 *   - a note is always looked up by BOTH its id and its lead's id, so a note id
 *     from another lead is "not found" (no cross-lead access);
 *   - only the note's author may edit or delete it. A legacy note (no author)
 *     can be neither edited nor deleted by anyone, and the write queries repeat
 *     the author in their filter as a second guard;
 *   - each change and its LeadActivity entry are written in one transaction;
 *   - an edit is refused (conflict) if the note changed since the admin loaded it.
 *
 * Activity entries carry the note id and the actor. For edits and deletes the
 * previous text is kept in the entry's `metadata` as an audit record (as the
 * schema documents); it is never selected by the read services or shown in the
 * UI, and notes are never mass-deleted or rewritten here.
 */

/** A second identical note by the same author within this window is a double submit. */
export const DUPLICATE_NOTE_WINDOW_MS = 15_000;

/** Prisma's "record to update/delete not found": a guarded write matched no row. */
const isNoMatch = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2025";

type Result<T> = Promise<AdminUpdateResult<T>>;

export async function createNote(
  admin: unknown,
  leadId: string,
  input: LeadNoteInput,
): Result<NoteChange> {
  assertAdmin(admin, { leadNote: ["create"] });
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };

  try {
    return await getPrisma().$transaction(async (tx): Result<NoteChange> => {
      const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { id: true } });
      if (!lead) return { ok: false, reason: "not_found" };

      // Double click, retry after a slow response, or two tabs: do not add it twice.
      const duplicate = await tx.leadNote.findFirst({
        where: {
          leadId,
          authorId: admin.userId,
          body: input.body,
          createdAt: { gte: new Date(Date.now() - DUPLICATE_NOTE_WINDOW_MS) },
        },
        select: noteSelect,
        orderBy: { createdAt: "desc" },
      });
      if (duplicate) {
        return { ok: true, data: { note: toNote(duplicate, admin.userId), changed: false } };
      }

      const note = await tx.leadNote.create({
        data: { leadId, authorId: admin.userId, body: input.body },
        select: noteSelect,
      });
      await tx.leadActivity.create({
        data: { leadId, actorId: admin.userId, action: "NOTE_ADDED", noteId: note.id },
      });
      return { ok: true, data: { note: toNote(note, admin.userId), changed: true } };
    });
  } catch (error) {
    logServerError("admin-notes", "Failed to add a note", error);
    return { ok: false, reason: "failed" };
  }
}

export async function updateNote(
  admin: unknown,
  leadId: string,
  noteId: string,
  input: LeadNoteEdit,
): Result<NoteChange> {
  assertAdmin(admin, { leadNote: ["update"] });
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };

  try {
    return await getPrisma().$transaction(async (tx): Result<NoteChange> => {
      const existing = await tx.leadNote.findFirst({
        where: { id: noteId, leadId },
        select: noteSelect,
      });
      if (!existing) return { ok: false, reason: "not_found" };
      // Ownership. A legacy note has authorId null, which never equals a user id.
      if (existing.authorId !== admin.userId) return { ok: false, reason: "forbidden" };

      if (
        input.expectedUpdatedAt &&
        new Date(input.expectedUpdatedAt).getTime() !== existing.updatedAt.getTime()
      ) {
        return { ok: false, reason: "conflict" };
      }
      if (existing.body === input.body) {
        return { ok: true, data: { note: toNote(existing, admin.userId), changed: false } };
      }

      let updated;
      try {
        updated = await tx.leadNote.update({
          // Author and updatedAt in the filter: owner-only, and compare-and-set.
          where: { id: noteId, authorId: admin.userId, updatedAt: existing.updatedAt },
          data: { body: input.body },
          select: noteSelect,
        });
      } catch (error) {
        if (isNoMatch(error)) return { ok: false, reason: "conflict" };
        throw error;
      }
      await tx.leadActivity.create({
        data: {
          leadId,
          actorId: admin.userId,
          action: "NOTE_EDITED",
          noteId,
          metadata: { previousBody: existing.body },
        },
      });
      return { ok: true, data: { note: toNote(updated, admin.userId), changed: true } };
    });
  } catch (error) {
    logServerError("admin-notes", "Failed to edit a note", error);
    return { ok: false, reason: "failed" };
  }
}

export async function deleteNote(
  admin: unknown,
  leadId: string,
  noteId: string,
): Result<NoteDeletion> {
  assertAdmin(admin, { leadNote: ["delete"] });
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };

  try {
    return await getPrisma().$transaction(async (tx): Result<NoteDeletion> => {
      const existing = await tx.leadNote.findFirst({
        where: { id: noteId, leadId },
        select: { id: true, body: true, authorId: true },
      });
      if (!existing) return { ok: false, reason: "not_found" };
      if (existing.authorId !== admin.userId) return { ok: false, reason: "forbidden" };

      // Exactly this note, and only if it is still the admin's own.
      const removed = await tx.leadNote.deleteMany({
        where: { id: noteId, leadId, authorId: admin.userId },
      });
      if (removed.count !== 1) return { ok: false, reason: "conflict" };

      await tx.leadActivity.create({
        data: {
          leadId,
          actorId: admin.userId,
          action: "NOTE_DELETED",
          noteId,
          metadata: { previousBody: existing.body },
        },
      });
      return { ok: true, data: { noteId } };
    });
  } catch (error) {
    logServerError("admin-notes", "Failed to delete a note", error);
    return { ok: false, reason: "failed" };
  }
}
