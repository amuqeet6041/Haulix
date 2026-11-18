import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LeadNotesPanel } from "@/components/admin/lead-notes-panel";
import { ToastProvider } from "@/components/ui/toast";
import type { AdminLeadNote } from "@/types/admin";
import { NOTE_BODY_MAX } from "@/validations/admin-leads";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const LEAD = "cmi4x2k7p0000abcd1234efgh";

type Reply = { status?: number; body?: unknown } | Error;

function mockFetch(...replies: (Reply | Promise<Reply>)[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init! });
    const next = replies.length > 1 ? replies.shift()! : replies[0]!;
    const reply = await next;
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

const note = (id: string, overrides: Partial<AdminLeadNote> = {}): AdminLeadNote => ({
  id,
  body: `Body of ${id}`,
  author: { id: "u1", name: "Abdul Muqeet" },
  createdAt: "2026-11-12T10:00:00.000Z",
  updatedAt: "2026-11-12T10:00:00.000Z",
  canEdit: true,
  ...overrides,
});

const mine = note("cmine0000000000000000001");
const bobs = note("cbobs0000000000000000002", {
  author: { id: "u2", name: "Bob Admin" },
  canEdit: false,
});
const legacy = note("clegacy000000000000000003", {
  author: null,
  canEdit: false,
  body: "Imported note",
});

const created = (id: string, body: string) => ({
  status: 201,
  body: { ok: true, changed: true, note: note(id, { body }) },
});

function setup(notes: AdminLeadNote[] = [mine, bobs, legacy]) {
  const utils = render(
    <ToastProvider>
      <LeadNotesPanel leadId={LEAD} notes={notes} />
    </ToastProvider>,
  );
  return { user: userEvent.setup(), ...utils };
}

const field = () => screen.getByLabelText("Add a note") as HTMLTextAreaElement;
const addButton = () => screen.getByRole("button", { name: "Add note" });
const dialog = () => screen.queryByRole("alertdialog");

beforeEach(() => router.refresh.mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LeadNotesPanel: display and ownership", () => {
  it("shows every note, including legacy notes with no author", () => {
    setup();
    expect(screen.getByText("Body of cmine0000000000000000001")).toBeInTheDocument();
    expect(screen.getByText("Body of cbobs0000000000000000002")).toBeInTheDocument();
    expect(screen.getByText("Imported note")).toBeInTheDocument();
    expect(screen.getByText("Former team member")).toBeInTheDocument();
    expect(screen.getByText("Bob Admin")).toBeInTheDocument();
  });

  it("offers Edit and Delete only on the admin's own notes", () => {
    setup();
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]!).getByRole("button", { name: "Edit note 1" })).toBeInTheDocument();
    expect(within(items[0]!).getByRole("button", { name: "Delete note 1" })).toBeInTheDocument();
    // Another admin's note and the legacy note have no buttons at all.
    expect(within(items[1]!).queryAllByRole("button")).toHaveLength(0);
    expect(within(items[2]!).queryAllByRole("button")).toHaveLength(0);
  });

  it("gives every button a unique accessible name", () => {
    setup([mine, note("csecond00000000000000004")]);
    const names = screen
      .getAllByRole("button")
      .map((button) => button.textContent + (button.getAttribute("aria-label") ?? ""));
    expect(new Set(names).size).toBe(names.length);
    expect(screen.getByRole("button", { name: "Edit note 2" })).toBeInTheDocument();
  });

  it("shows an edited marker for edited notes only", () => {
    setup([note("cedited00000000000000005", { updatedAt: "2026-11-13T10:00:00.000Z" }), bobs]);
    const [first, second] = screen.getAllByRole("listitem");
    expect(first).toHaveTextContent("edited");
    expect(second).not.toHaveTextContent("edited");
  });

  it("says there are no notes when there are none", () => {
    setup([]);
    expect(screen.getByText("No notes yet.")).toBeInTheDocument();
  });

  it("keeps note line breaks and wraps long text", () => {
    setup([note("cmulti000000000000000006", { body: "Line one\nLine two" })]);
    expect(screen.getByText(/Line one/)).toHaveClass(
      "whitespace-pre-wrap",
      "[overflow-wrap:anywhere]",
    );
  });

  it("adopts the server's notes after a refresh", () => {
    const { rerender } = render(
      <ToastProvider>
        <LeadNotesPanel leadId={LEAD} notes={[mine]} />
      </ToastProvider>,
    );
    rerender(
      <ToastProvider>
        <LeadNotesPanel leadId={LEAD} notes={[mine, bobs]} />
      </ToastProvider>,
    );
    expect(screen.getByText("Body of cbobs0000000000000000002")).toBeInTheDocument();
  });
});

describe("LeadNotesPanel: adding a note", () => {
  it("has a labelled multiline field, a counter and an explicit Add note button", () => {
    setup();
    expect(field().tagName).toBe("TEXTAREA");
    expect(field()).toHaveAccessibleDescription(`0 / ${NOTE_BODY_MAX.toLocaleString("en-US")}`);
    expect(addButton()).toBeDisabled();
  });

  it("keeps Add note disabled for empty and whitespace-only text", async () => {
    const { user } = setup();
    await user.type(field(), "   ");
    expect(addButton()).toBeDisabled();
    await user.type(field(), "x");
    expect(addButton()).toBeEnabled();
  });

  it("updates the character counter as the person types", async () => {
    const { user } = setup();
    await user.type(field(), "Hello");
    expect(screen.getByText("5 / 5,000")).toBeInTheDocument();
  });

  it("rejects a note over the limit on the client, without a request", async () => {
    const { fetchMock } = mockFetch(created("cnew000000000000000000007", "x"));
    const { user } = setup();
    // Typing 5001 characters one by one is slow; paste instead.
    await user.click(field());
    await user.paste("x".repeat(NOTE_BODY_MAX + 1));
    expect(screen.getByText(/too long/)).toBeInTheDocument();
    await user.click(addButton());

    expect(await screen.findByText(/under 5000 characters/)).toBeInTheDocument();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the note, shows it first, clears the field, toasts, and refreshes the page data", async () => {
    const { calls } = mockFetch(created("cnew000000000000000000007", "Called, no answer."));
    const { user } = setup();
    await user.type(field(), "Called, no answer.");
    await user.click(addButton());

    await waitFor(() => expect(screen.getByText("Called, no answer.")).toBeInTheDocument());
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(`/api/admin/leads/${LEAD}/notes`);
    expect(calls[0]!.init.method).toBe("POST");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ body: "Called, no answer." });

    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Called, no answer.");
    expect(field()).toHaveValue("");
    expect(await screen.findByText("Note added")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("shows an inline error and a toast on failure, and keeps the person's text", async () => {
    mockFetch({
      status: 500,
      body: { ok: false, message: "Something went wrong on our side. Please try again." },
    });
    const { user } = setup();
    await user.type(field(), "Important text");
    await user.click(addButton());

    expect(
      (await screen.findAllByText(/Something went wrong on our side/)).length,
    ).toBeGreaterThanOrEqual(1);
    expect(field()).toHaveValue("Important text");
    expect(screen.queryByText("Note added")).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("explains a network failure", async () => {
    mockFetch(new TypeError("Failed to fetch"));
    const { user } = setup();
    await user.type(field(), "x");
    await user.click(addButton());
    expect(
      (await screen.findAllByText(/could not reach the server/i)).length,
    ).toBeGreaterThanOrEqual(1);
    expect(field()).toHaveValue("x");
  });

  it("shows a loading state and sends only one request however many times it is submitted", async () => {
    let finish!: (reply: Reply) => void;
    const pending = new Promise<Reply>((resolve) => (finish = resolve));
    const { fetchMock } = mockFetch(pending);
    const { user } = setup();
    await user.type(field(), "Once only");
    await user.click(addButton());

    expect(screen.getByRole("button", { name: "Adding…" })).toBeDisabled();
    expect(field()).toBeDisabled();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Adding…" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => finish(created("cnew000000000000000000007", "Once only")));
    await waitFor(() => expect(field()).toHaveValue(""));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Once only")).toHaveLength(1);
  });

  it("does not list a note twice if the server says it already exists (a repeat)", async () => {
    mockFetch({ status: 200, body: { ok: true, changed: false, note: mine } });
    const { user } = setup([mine]);
    await user.type(field(), "Body of cmine0000000000000000001");
    await user.click(addButton());
    await waitFor(() => expect(field()).toHaveValue(""));
    expect(screen.getAllByText("Body of cmine0000000000000000001")).toHaveLength(1);
  });
});

describe("LeadNotesPanel: editing a note", () => {
  const edited = (body: string) => ({
    status: 200,
    body: {
      ok: true,
      changed: true,
      note: { ...mine, body, updatedAt: "2026-11-14T10:00:00.000Z" },
    },
  });

  async function startEdit(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Edit note 1" }));
    return screen.getByLabelText("Edit note 1") as HTMLTextAreaElement;
  }

  it("opens an editor with the current text, and Save is off until something changes", async () => {
    const { user } = setup();
    const editor = await startEdit(user);
    expect(editor).toHaveValue("Body of cmine0000000000000000001");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.type(editor, "!");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("cancelling discards the changes and sends nothing", async () => {
    const { fetchMock } = mockFetch(edited("x"));
    const { user } = setup();
    const editor = await startEdit(user);
    await user.type(editor, " more");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Body of cmine0000000000000000001")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Edit note 1" }));
    expect(screen.getByLabelText("Edit note 1")).toHaveValue("Body of cmine0000000000000000001");
  });

  it("will not save an empty edit", async () => {
    const { fetchMock } = mockFetch(edited("x"));
    const { user } = setup();
    const editor = await startEdit(user);
    await user.clear(editor);
    await user.type(editor, "   ");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Please write a note.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves with the version it loaded, shows the new text and an edited marker, and toasts", async () => {
    const { calls } = mockFetch(edited("Rewritten text"));
    const { user } = setup();
    const editor = await startEdit(user);
    await user.clear(editor);
    await user.type(editor, "Rewritten text");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(screen.getByText("Rewritten text")).toBeInTheDocument());
    expect(calls[0]!.url).toBe(`/api/admin/leads/${LEAD}/notes/${mine.id}`);
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      body: "Rewritten text",
      expectedUpdatedAt: mine.updatedAt,
    });
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("edited");
    expect(await screen.findByText("Note updated")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledTimes(1);
    // The author does not change.
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Abdul Muqeet");
  });

  it("stays in the editor, keeping the text, when saving fails", async () => {
    mockFetch({
      status: 500,
      body: { ok: false, message: "Something went wrong on our side. Please try again." },
    });
    const { user } = setup();
    const editor = await startEdit(user);
    await user.type(editor, " plus");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      (await screen.findAllByText(/Something went wrong on our side/)).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("Edit note 1")).toHaveValue(
      "Body of cmine0000000000000000001 plus",
    );
  });

  it("on a conflict, closes the editor, says so, and reloads the real notes", async () => {
    mockFetch({
      status: 409,
      body: {
        ok: false,
        code: "conflict",
        message: "This changed since you loaded it. Refresh and try again.",
      },
    });
    const { user } = setup();
    const editor = await startEdit(user);
    await user.type(editor, "!");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      (await screen.findAllByText(/changed since you loaded it/)).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("textbox", { name: "Edit note 1" })).not.toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("sends one request for repeated Save clicks", async () => {
    let finish!: (reply: Reply) => void;
    const { fetchMock } = mockFetch(new Promise<Reply>((resolve) => (finish = resolve)));
    const { user } = setup();
    const editor = await startEdit(user);
    await user.type(editor, "!");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => finish(edited("Body of cmine0000000000000000001!")));
  });
});

describe("LeadNotesPanel: deleting a note", () => {
  it("asks first, with a clear warning, and cancelling removes nothing", async () => {
    const { fetchMock } = mockFetch({ body: { ok: true, noteId: mine.id } });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Delete note 1" }));

    const confirmation = await screen.findByRole("alertdialog", { name: "Delete this note?" });
    expect(confirmation).toHaveAccessibleDescription(/cannot be undone.*activity history/);
    expect(screen.getByRole("button", { name: "Delete note" }).className).toContain(
      "text-destructive",
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Body of cmine0000000000000000001")).toBeInTheDocument();
  });

  it("deletes the note, removes it from the list, toasts, and refreshes", async () => {
    const { calls } = mockFetch({ body: { ok: true, noteId: mine.id } });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Delete note 1" }));
    await user.click(await screen.findByRole("button", { name: "Delete note" }));

    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(`/api/admin/leads/${LEAD}/notes/${mine.id}`);
    expect(calls[0]!.init.method).toBe("DELETE");
    expect(screen.queryByText("Body of cmine0000000000000000001")).not.toBeInTheDocument();
    // The other notes are untouched.
    expect(screen.getByText("Imported note")).toBeInTheDocument();
    expect(await screen.findByText("Note deleted")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the note and the dialog open when the delete fails, so it can be retried", async () => {
    mockFetch(
      {
        status: 500,
        body: { ok: false, message: "Something went wrong on our side. Please try again." },
      },
      { body: { ok: true, noteId: mine.id } },
    );
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Delete note 1" }));
    await user.click(await screen.findByRole("button", { name: "Delete note" }));

    expect(
      (await screen.findAllByText(/Something went wrong on our side/)).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Body of cmine0000000000000000001")).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete note" }));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(screen.queryByText("Body of cmine0000000000000000001")).not.toBeInTheDocument();
  });

  it("closes and reloads when the note was already gone", async () => {
    mockFetch({
      status: 404,
      body: { ok: false, code: "not_found", message: "We could not find that." },
    });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Delete note 1" }));
    await user.click(await screen.findByRole("button", { name: "Delete note" }));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("sends a single request for repeated confirmations", async () => {
    let finish!: (reply: Reply) => void;
    const { fetchMock } = mockFetch(new Promise<Reply>((resolve) => (finish = resolve)));
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Delete note 1" }));
    const confirm = await screen.findByRole("button", { name: "Delete note" });
    await user.click(confirm);
    await user.click(confirm);
    await user.dblClick(confirm);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => finish({ body: { ok: true, noteId: mine.id } }));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
