import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LeadStatusControl, STATUS_ERROR } from "@/components/admin/lead-status-control";
import { ToastProvider } from "@/components/ui/toast";
import { leadStatuses } from "@/content/lead-status";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const ID = "cmi4x2k7p0000abcd1234efgh";
const URL_PATH = `/api/admin/leads/${ID}/status`;

type Reply = { status?: number; body?: unknown } | Error;

/** Fake fetch: records requests, answers from a queue (last reply repeats). */
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

const changed = (status: string) => ({
  body: {
    ok: true,
    changed: true,
    lead: { id: ID, status, updatedAt: "2026-11-18T12:00:00.000Z", contactedAt: null },
  },
});

function setup(status: "NEW" | "CONTACTED" | "SPAM" = "NEW") {
  const utils = render(
    <ToastProvider>
      <LeadStatusControl leadId={ID} status={status} />
    </ToastProvider>,
  );
  return { user: userEvent.setup(), ...utils };
}

const select = () => screen.getByLabelText("Change status") as HTMLSelectElement;
const updateButton = () => screen.getByRole("button", { name: "Update status" });
const dialog = () => screen.queryByRole("alertdialog");

async function choose(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.selectOptions(select(), label);
}

beforeEach(() => router.refresh.mockReset());

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LeadStatusControl: display and selection", () => {
  it("shows the current status with its description", () => {
    setup("CONTACTED");
    expect(screen.getByText("Current status:")).toBeInTheDocument();
    const meta = leadStatuses.find((s) => s.value === "CONTACTED")!;
    expect(screen.getByText(meta.description)).toBeInTheDocument();
    expect(screen.getAllByText("Contacted").length).toBeGreaterThanOrEqual(1);
  });

  it("offers all six statuses, marking the current one", () => {
    setup("QUALIFIED" as "NEW");
    expect([...select().options].map((o) => o.textContent)).toEqual([
      "New",
      "Contacted",
      "Qualified (current)",
      "Onboarded",
      "Rejected",
      "Spam",
    ]);
    expect(select().value).toBe("QUALIFIED");
  });

  it("has an accessible label and a hint that says nothing changes until confirmed", () => {
    setup();
    expect(select()).toHaveAccessibleDescription(/Nothing changes until you confirm/);
  });

  it("disables Update status until a different status is chosen", async () => {
    const { user } = setup();
    expect(updateButton()).toBeDisabled();
    await choose(user, "Contacted");
    expect(updateButton()).toBeEnabled();
    await choose(user, "New (current)");
    expect(updateButton()).toBeDisabled();
  });

  it("does not send anything just because a status was selected", async () => {
    const { fetchMock } = mockFetch(changed("CONTACTED"));
    const { user } = setup();
    await choose(user, "Spam");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(dialog()).not.toBeInTheDocument();
  });

  it("can be operated with the keyboard", async () => {
    const { fetchMock } = mockFetch(changed("QUALIFIED"));
    const { user } = setup();
    await user.tab();
    expect(select()).toHaveFocus();
    await user.selectOptions(select(), "Qualified");
    expect(select().value).toBe("QUALIFIED");
    await user.tab();
    expect(updateButton()).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("LeadStatusControl: confirmation", () => {
  it("asks before applying, naming both statuses and the audit trail", async () => {
    const { user } = setup();
    await choose(user, "Qualified");
    await user.click(updateButton());

    const confirmation = await screen.findByRole("alertdialog", {
      name: "Change status to Qualified?",
    });
    expect(confirmation).toHaveAccessibleDescription(
      /from New to Qualified.*recorded in the lead's activity history/,
    );
    expect(screen.getByRole("button", { name: "Change to Qualified" })).toBeInTheDocument();
  });

  it("cancelling sends nothing and keeps the old status", async () => {
    const { fetchMock } = mockFetch(changed("SPAM"));
    const { user } = setup();
    await choose(user, "Spam");
    await user.click(updateButton());
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(updateButton()).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
    expect(screen.getByText("Current status:").parentElement).toHaveTextContent("New");
  });

  it("uses the destructive style for Rejected and Spam only", async () => {
    const { user } = setup();
    await choose(user, "Spam");
    await user.click(updateButton());
    expect((await screen.findByRole("button", { name: "Change to Spam" })).className).toContain(
      "text-destructive",
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());

    await choose(user, "Contacted");
    await user.click(updateButton());
    expect(
      (await screen.findByRole("button", { name: "Change to Contacted" })).className,
    ).not.toContain("text-destructive");
  });
});

describe("LeadStatusControl: successful update", () => {
  it("sends the change with the status the admin saw, then updates everything", async () => {
    const { calls } = mockFetch(changed("CONTACTED"));
    const { user } = setup();
    await choose(user, "Contacted");
    await user.click(updateButton());
    await user.click(await screen.findByRole("button", { name: "Change to Contacted" }));

    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(URL_PATH);
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      status: "CONTACTED",
      expectedStatus: "NEW",
    });

    // The displayed status changes immediately, from the response.
    expect(screen.getByText("Current status:").parentElement).toHaveTextContent("Contacted");
    expect(screen.getByText("We reached out and are waiting on a reply.")).toBeInTheDocument();
    expect(select().value).toBe("CONTACTED");
    expect(updateButton()).toBeDisabled();
    // And the server-rendered data is refreshed (badge, activity, other pages).
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("announces success politely through the toast", async () => {
    mockFetch(changed("QUALIFIED"));
    const { user } = setup();
    await choose(user, "Qualified");
    await user.click(updateButton());
    await user.click(await screen.findByRole("button", { name: "Change to Qualified" }));

    const status = await screen.findByRole("status");
    await waitFor(() => expect(within(status).getByText("Status updated")).toBeInTheDocument());
    expect(within(status).getByText("This lead is now Qualified.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("moves focus to the status selector afterwards, since there is nothing left to update", async () => {
    mockFetch(changed("QUALIFIED"));
    const { user } = setup();
    await choose(user, "Qualified");
    await user.click(updateButton());
    await user.click(await screen.findByRole("button", { name: "Change to Qualified" }));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(select()).toHaveFocus();
  });

  it("tells the person when the lead already had that status", async () => {
    mockFetch({
      body: {
        ok: true,
        changed: false,
        lead: { id: ID, status: "CONTACTED", updatedAt: "x", contactedAt: null },
      },
    });
    const { user } = setup();
    await choose(user, "Contacted");
    await user.click(updateButton());
    await user.click(await screen.findByRole("button", { name: "Change to Contacted" }));

    expect(await screen.findByText("No change")).toBeInTheDocument();
    expect(screen.getByText("This lead was already Contacted.")).toBeInTheDocument();
  });

  it("works for every status as the starting point", async () => {
    for (const from of ["NEW", "CONTACTED", "SPAM"] as const) {
      const { calls } = mockFetch(changed("ONBOARDED"));
      const { user, unmount } = setup(from);
      await choose(user, "Onboarded");
      await user.click(updateButton());
      await user.click(await screen.findByRole("button", { name: "Change to Onboarded" }));
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
        status: "ONBOARDED",
        expectedStatus: from,
      });
      unmount();
      cleanup();
    }
  });
});

describe("LeadStatusControl: submission state", () => {
  it("shows a working state and disables both buttons while the request runs", async () => {
    let finish!: (reply: Reply) => void;
    const pending = new Promise<Reply>((resolve) => (finish = resolve));
    mockFetch(pending);
    const { user } = setup();
    await choose(user, "Contacted");
    await user.click(updateButton());
    await user.click(await screen.findByRole("button", { name: "Change to Contacted" }));

    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    await act(async () => finish(changed("CONTACTED")));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
  });

  it("sends only one request however many times Confirm is activated", async () => {
    let finish!: (reply: Reply) => void;
    const pending = new Promise<Reply>((resolve) => (finish = resolve));
    const { fetchMock } = mockFetch(pending);
    const { user } = setup();
    await choose(user, "Contacted");
    await user.click(updateButton());
    const confirm = await screen.findByRole("button", { name: "Change to Contacted" });

    await user.click(confirm);
    await user.click(confirm);
    await user.dblClick(confirm);
    await user.keyboard("{Enter}");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => finish(changed("CONTACTED")));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});

describe("LeadStatusControl: failures", () => {
  async function attempt(...replies: Reply[]) {
    const mock = mockFetch(...replies);
    const utils = setup();
    await choose(utils.user, "Contacted");
    await utils.user.click(updateButton());
    await utils.user.click(await screen.findByRole("button", { name: "Change to Contacted" }));
    return { ...mock, ...utils };
  }

  it("announces a failure assertively, keeps the dialog open and the old status", async () => {
    await attempt({
      status: 500,
      body: {
        ok: false,
        code: "server_error",
        message: "Something went wrong on our side. Please try again.",
      },
    });

    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(within(alert).getByText("Status not updated")).toBeInTheDocument());
    expect(within(alert).getByText(/Something went wrong on our side/)).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Current status:").parentElement).toHaveTextContent("New");
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("puts focus on Cancel and lets the person retry successfully", async () => {
    const { calls, user } = await attempt(
      { status: 500, body: { message: "Something went wrong on our side. Please try again." } },
      changed("CONTACTED"),
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());

    await user.click(screen.getByRole("button", { name: "Change to Contacted" }));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(calls).toHaveLength(2);
    expect(screen.getByText("Current status:").parentElement).toHaveTextContent("Contacted");
  });

  it("explains a network failure", async () => {
    await attempt(new TypeError("Failed to fetch"));
    expect(await screen.findByText(STATUS_ERROR.network)).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("shows a generic message when the server answers with something that is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>Bad gateway</html>", { status: 502 })),
    );
    const { user } = setup();
    await choose(user, "Contacted");
    await user.click(updateButton());
    await user.click(await screen.findByRole("button", { name: "Change to Contacted" }));
    expect(await screen.findByText(STATUS_ERROR.unexpected)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Bad gateway");
  });

  it("shows the server's validation message for a 422", async () => {
    await attempt({
      status: 422,
      body: {
        ok: false,
        code: "validation_failed",
        message: "Please check the highlighted fields.",
      },
    });
    expect(await screen.findByText("Please check the highlighted fields.")).toBeInTheDocument();
  });

  it("asks the person to sign in again when the session has ended", async () => {
    await attempt({
      status: 401,
      body: { ok: false, code: "unauthenticated", message: "Please sign in to continue." },
    });
    expect(
      await screen.findByText("Your session has ended. Please sign in again."),
    ).toBeInTheDocument();
  });

  it("on a conflict, says someone else changed it, closes the dialog and reloads the lead", async () => {
    await attempt({ status: 409, body: { ok: false, code: "conflict", message: "x" } });

    expect(await screen.findByText(STATUS_ERROR.conflict)).toBeInTheDocument();
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("never shows technical details from the response", async () => {
    await attempt({ status: 500, body: { ok: false, stack: "at postgres://secret", message: "" } });
    expect(await screen.findByText(STATUS_ERROR.unexpected)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/postgres|secret|stack/);
  });
});

describe("LeadStatusControl: staying in sync with the server", () => {
  it("adopts a new status from the server after a refresh, without losing the page", () => {
    const { rerender } = render(
      <ToastProvider>
        <LeadStatusControl leadId={ID} status="NEW" />
      </ToastProvider>,
    );
    rerender(
      <ToastProvider>
        <LeadStatusControl leadId={ID} status="ONBOARDED" />
      </ToastProvider>,
    );
    expect(select().value).toBe("ONBOARDED");
    expect(screen.getByText("Current status:").parentElement).toHaveTextContent("Onboarded");
    expect(screen.getByRole("option", { name: "Onboarded (current)" })).toBeInTheDocument();
  });
});
