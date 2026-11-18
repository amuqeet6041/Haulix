"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { LocalTime } from "@/components/admin/local-time";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { adminFetch, type AdminFetchResult } from "@/lib/admin-fetch";
import { UNKNOWN_ACTOR } from "@/lib/lead-timeline";
import { cn } from "@/lib/utils";
import type { AdminLeadNote } from "@/types/admin";
import { leadNoteSchema, NOTE_BODY_MAX } from "@/validations/admin-leads";

/**
 * Internal notes for one lead: read them, add one, and edit or delete your own.
 *
 * What is shown is a convenience; the server decides. Edit and Delete appear
 * only on notes the server marked `canEdit` (written by the signed-in admin),
 * and the API refuses anyone else anyway. Legacy notes, and notes by other
 * admins, are read-only with no buttons.
 *
 * Every action is explicit (Add note, Save changes, a confirmation for Delete),
 * guarded against double submission, and reported with a toast. After a change
 * the server data is refreshed so the activity timeline updates too.
 */

const notesUrl = (leadId: string) => `/api/admin/leads/${encodeURIComponent(leadId)}/notes`;
const noteUrl = (leadId: string, noteId: string) =>
  `${notesUrl(leadId)}/${encodeURIComponent(noteId)}`;

/** The same rule the server applies: trimmed, 1 to 5000 characters. Returns a message or null. */
export function noteProblem(text: string): string | null {
  const result = leadNoteSchema.shape.body.safeParse(text);
  return result.success ? null : (result.error.issues[0]?.message ?? "Please check this note.");
}

function Counter({ id, length }: { id: string; length: number }) {
  const over = length > NOTE_BODY_MAX;
  return (
    <p id={id} className={cn("text-xs tabular-nums", over ? "text-destructive" : "text-gray")}>
      {length.toLocaleString("en-US")} / {NOTE_BODY_MAX.toLocaleString("en-US")}
      {over ? " (too long)" : ""}
    </p>
  );
}

function AddNoteForm({
  leadId,
  onAdded,
}: {
  leadId: string;
  onAdded: (note: AdminLeadNote) => void;
}) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    const invalid = noteProblem(text);
    if (invalid) {
      setProblem(invalid);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const result = await adminFetch("POST", notesUrl(leadId), { body: text });
      if (result.kind === "ok") {
        onAdded(result.body.note as AdminLeadNote);
        setText("");
        toast.success("Note added");
      } else {
        setProblem(result.message);
        toast.error("Note not added", result.message);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 border-t border-border pt-5">
      <Label htmlFor="new-note">Add a note</Label>
      <Textarea
        id="new-note"
        className="mt-1.5"
        rows={4}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          if (problem) setProblem(null);
        }}
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? "new-note-count new-note-error" : "new-note-count"}
        disabled={busy}
        placeholder="Only admins can see notes. Press Add note to save."
      />
      <div className="mt-1.5 flex flex-wrap items-start justify-between gap-2">
        <div>
          {problem ? (
            <p id="new-note-error" role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          ) : null}
        </div>
        <Counter id="new-note-count" length={text.length} />
      </div>
      <Button type="submit" className="mt-3" disabled={busy || text.trim() === ""}>
        {busy ? "Adding…" : "Add note"}
      </Button>
    </form>
  );
}

function NoteItem({
  note,
  position,
  leadId,
  onChanged,
  onDelete,
  onConflict,
}: {
  note: AdminLeadNote;
  /** 1-based place in the list, so button names are unique for screen readers. */
  position: number;
  leadId: string;
  onChanged: (note: AdminLeadNote) => void;
  onDelete: (note: AdminLeadNote) => void;
  onConflict: () => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.body);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const edited = note.updatedAt !== note.createdAt;

  function startEditing() {
    setText(note.body);
    setProblem(null);
    setEditing(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    const invalid = noteProblem(text);
    if (invalid) {
      setProblem(invalid);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const result: AdminFetchResult = await adminFetch("PATCH", noteUrl(leadId, note.id), {
        body: text,
        expectedUpdatedAt: note.updatedAt,
      });
      if (result.kind === "ok") {
        onChanged(result.body.note as AdminLeadNote);
        setEditing(false);
        toast.success(result.body.changed === false ? "No changes to save" : "Note updated");
      } else if (result.kind === "error" && (result.status === 409 || result.status === 404)) {
        // Changed or removed elsewhere: show the latest instead of overwriting it.
        setEditing(false);
        toast.error("Note not updated", result.message);
        onConflict();
      } else {
        setProblem(result.message);
        toast.error("Note not updated", result.message);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-border bg-ink/40 p-4">
      {editing ? (
        <form onSubmit={save} noValidate>
          <Label htmlFor={`edit-note-${note.id}`}>Edit note {position}</Label>
          <Textarea
            id={`edit-note-${note.id}`}
            className="mt-1.5"
            rows={4}
            value={text}
            autoFocus
            disabled={busy}
            onChange={(event) => {
              setText(event.target.value);
              if (problem) setProblem(null);
            }}
            aria-invalid={problem ? true : undefined}
            aria-describedby={
              problem ? `edit-count-${note.id} edit-error-${note.id}` : `edit-count-${note.id}`
            }
          />
          <div className="mt-1.5 flex flex-wrap items-start justify-between gap-2">
            <div>
              {problem ? (
                <p id={`edit-error-${note.id}`} role="alert" className="text-sm text-destructive">
                  {problem}
                </p>
              ) : null}
            </div>
            <Counter id={`edit-count-${note.id}`} length={text.length} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={busy || text.trim() === note.body}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-foreground">
            {note.body}
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-gray">
            <span>{note.author?.name.trim() || UNKNOWN_ACTOR}</span>
            <span aria-hidden="true">&middot;</span>
            <LocalTime iso={note.createdAt} />
            {edited ? (
              <>
                <span aria-hidden="true">&middot;</span>
                <span>
                  edited <LocalTime iso={note.updatedAt} />
                </span>
              </>
            ) : null}
          </p>
          {note.canEdit ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                aria-label={`Edit note ${position}`}
                onClick={startEditing}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                aria-label={`Delete note ${position}`}
                onClick={() => onDelete(note)}
              >
                Delete
              </Button>
            </div>
          ) : null}
        </>
      )}
    </li>
  );
}

export function LeadNotesPanel({ leadId, notes }: { leadId: string; notes: AdminLeadNote[] }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState(notes);
  // Adopt the server's notes when they change (after a refresh). Adjusting state
  // during render avoids a remount that would lose focus or close a dialog.
  const signature = notes.map((note) => `${note.id}:${note.updatedAt}`).join("|");
  const [seen, setSeen] = useState(signature);
  if (signature !== seen) {
    setSeen(signature);
    setItems(notes);
  }
  const [deleting, setDeleting] = useState<AdminLeadNote | null>(null);

  const refresh = () => startTransition(() => router.refresh());

  async function confirmDelete() {
    if (!deleting) return;
    const note = deleting;
    const result = await adminFetch("DELETE", noteUrl(leadId, note.id));
    if (result.kind === "ok") {
      setItems((current) => current.filter((item) => item.id !== note.id));
      toast.success("Note deleted");
      refresh();
      return;
    }
    toast.error("Note not deleted", result.message);
    if (result.kind === "error" && (result.status === 404 || result.status === 409)) {
      // Already gone or changed: reload the real list and close the dialog.
      refresh();
      return;
    }
    // Keep the dialog open, and the note, so the person can retry or cancel.
    throw new Error("note delete failed");
  }

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm text-gray">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((note, index) => (
            <NoteItem
              key={note.id}
              note={note}
              position={index + 1}
              leadId={leadId}
              onChanged={(next) => {
                setItems((current) => current.map((item) => (item.id === next.id ? next : item)));
                refresh();
              }}
              onDelete={setDeleting}
              onConflict={refresh}
            />
          ))}
        </ul>
      )}

      <AddNoteForm
        leadId={leadId}
        onAdded={(note) => {
          setItems((current) =>
            current.some((item) => item.id === note.id) ? current : [note, ...current],
          );
          refresh();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this note?"
        description="The note will be removed for everyone. This cannot be undone, and the deletion is recorded in the lead's activity history."
        confirmLabel="Delete note"
        tone="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
