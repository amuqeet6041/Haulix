import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccountPasswordForm, PASSWORD_MESSAGES } from "@/components/admin/account-password-form";
import { AccountProfileForm } from "@/components/admin/account-profile-form";
import { AccountSessions, SESSION_MESSAGES } from "@/components/admin/account-sessions";
import { AccountView } from "@/components/admin/account-view";
import { ToastProvider } from "@/components/ui/toast";
import type { AccountProfile, AccountSession } from "@/types/account";

const router = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

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

const profile: AccountProfile = {
  name: "Abdul Muqeet",
  email: "admin@haulix.test",
  role: "admin",
  memberSince: "2026-11-01T09:00:00.000Z",
};

const sessions: AccountSession[] = [
  {
    id: "sess_current",
    current: true,
    device: "Chrome on Windows",
    createdAt: "2026-11-18T10:00:00.000Z",
    lastActiveAt: "2026-11-18T11:00:00.000Z",
    expiresAt: "2026-11-19T10:00:00.000Z",
  },
  {
    id: "sess_phone",
    current: false,
    device: "Safari on iOS",
    createdAt: "2026-11-17T08:00:00.000Z",
    lastActiveAt: "2026-11-17T09:00:00.000Z",
    expiresAt: "2026-11-18T08:00:00.000Z",
  },
  {
    id: "sess_old",
    current: false,
    device: "Safari on iOS",
    createdAt: "2026-11-16T08:00:00.000Z",
    lastActiveAt: "2026-11-16T09:00:00.000Z",
    expiresAt: "2026-11-17T08:00:00.000Z",
  },
];

const wrap = (ui: React.ReactElement) => <ToastProvider>{ui}</ToastProvider>;
const dialog = () => screen.queryByRole("alertdialog");

beforeEach(() => {
  router.refresh.mockReset();
  router.replace.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AccountView", () => {
  it("shows profile, password and sessions as labelled sections, and the account creation time", () => {
    render(
      wrap(
        <AccountView
          profile={{ ok: true, data: profile }}
          sessions={{ ok: true, data: sessions }}
        />,
      ),
    );
    for (const name of ["Profile", "Password", "Where you are signed in"]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
    expect(screen.getByText(/Account created/)).toBeInTheDocument();
    expect(document.querySelector("time")).toHaveAttribute("datetime", profile.memberSince);
  });

  it("fails one section at a time: a sessions error does not hide the password form", () => {
    render(
      wrap(
        <AccountView
          profile={{ ok: true, data: profile }}
          sessions={{ ok: false, reason: "failed" }}
        />,
      ),
    );
    expect(screen.getByText("Sessions unavailable")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    expect(screen.queryByText("Profile unavailable")).not.toBeInTheDocument();
  });

  it("shows a profile error without exposing details", () => {
    render(
      wrap(
        <AccountView profile={{ ok: false, reason: "failed" }} sessions={{ ok: true, data: [] }} />,
      ),
    );
    expect(screen.getByText("Profile unavailable")).toBeInTheDocument();
  });

  it("never renders tokens, hashes or ids", () => {
    const { container } = render(
      wrap(
        <AccountView
          profile={{ ok: true, data: profile }}
          sessions={{ ok: true, data: sessions }}
        />,
      ),
    );
    expect(container.innerHTML).not.toMatch(/token|hash|sess_/i);
  });
});

describe("AccountProfileForm", () => {
  const setup = () => {
    const utils = render(wrap(<AccountProfileForm profile={profile} />));
    return { user: userEvent.setup(), ...utils };
  };
  const nameField = () => screen.getByLabelText("Name") as HTMLInputElement;
  const save = () => screen.getByRole("button", { name: "Save changes" });

  it("shows the name as editable, and the email and role as read-only text", () => {
    setup();
    expect(nameField()).toHaveValue("Abdul Muqeet");
    expect(screen.getByText("admin@haulix.test")).toBeInTheDocument();
    expect(screen.getByText(/cannot be changed here/)).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();
    // The only input is the name: email and role cannot be edited.
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("keeps Save off until the name changes, and saves only on the explicit button", async () => {
    const { fetchMock } = mockFetch({ body: { ok: true, name: "New Name" } });
    const { user } = setup();
    expect(save()).toBeDisabled();
    await user.clear(nameField());
    await user.type(nameField(), "New Name");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(save()).toBeEnabled();
  });

  it("saves the name, shows a toast, and refreshes the header", async () => {
    const { calls } = mockFetch({ body: { ok: true, name: "New Name" } });
    const { user } = setup();
    await user.clear(nameField());
    await user.type(nameField(), "  New Name  ");
    await user.click(save());

    expect(await screen.findByText("Profile updated")).toBeInTheDocument();
    expect(calls[0]!.url).toBe("/api/admin/account/profile");
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ name: "New Name" });
    expect(nameField()).toHaveValue("New Name");
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(save()).toBeDisabled();
  });

  it("rejects an empty or over-long name without a request", async () => {
    const { fetchMock } = mockFetch({ body: { ok: true } });
    const { user } = setup();
    await user.clear(nameField());
    await user.type(nameField(), "   ");
    await user.click(save());
    expect(await screen.findByText("Please enter your name.")).toBeInTheDocument();
    expect(nameField()).toHaveAttribute("aria-invalid", "true");

    await user.clear(nameField());
    await user.click(nameField());
    await user.paste("x".repeat(101));
    await user.click(save());
    expect(await screen.findByText(/under 100 characters/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server's message when saving fails, and keeps what was typed", async () => {
    mockFetch({
      status: 500,
      body: { ok: false, message: "Something went wrong on our side. Please try again." },
    });
    const { user } = setup();
    await user.clear(nameField());
    await user.type(nameField(), "Other");
    await user.click(save());
    expect(
      (await screen.findAllByText(/Something went wrong on our side/)).length,
    ).toBeGreaterThanOrEqual(1);
    expect(nameField()).toHaveValue("Other");
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("sends only one request for repeated submits", async () => {
    let finish!: (reply: Reply) => void;
    const { fetchMock } = mockFetch(new Promise<Reply>((resolve) => (finish = resolve)));
    const { user } = setup();
    await user.clear(nameField());
    await user.type(nameField(), "Once");
    await user.click(save());
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => finish({ body: { ok: true, name: "Once" } }));
  });
});

describe("AccountPasswordForm", () => {
  const setup = () => {
    const utils = render(wrap(<AccountPasswordForm />));
    return { user: userEvent.setup(), ...utils };
  };
  const current = () => screen.getByLabelText("Current password") as HTMLInputElement;
  const next = () => screen.getByLabelText("New password") as HTMLInputElement;
  const confirm = () => screen.getByLabelText("Confirm new password") as HTMLInputElement;
  const submit = () => screen.getByRole("button", { name: "Change password" });

  async function fill(user: ReturnType<typeof userEvent.setup>, a: string, b: string, c: string) {
    if (a) await user.type(current(), a);
    if (b) await user.type(next(), b);
    if (c) await user.type(confirm(), c);
  }

  it("has three labelled password fields with the right autocomplete hints", () => {
    setup();
    for (const field of [current(), next(), confirm()])
      expect(field).toHaveAttribute("type", "password");
    expect(current()).toHaveAttribute("autocomplete", "current-password");
    expect(next()).toHaveAttribute("autocomplete", "new-password");
    expect(next()).toHaveAccessibleDescription(/At least 6 characters/);
  });

  it("checks everything before sending: required fields, length, match, and difference", async () => {
    const { fetchMock } = mockFetch({ body: {} });
    const { user } = setup();

    await user.click(submit());
    expect(await screen.findByText("Please enter your current password.")).toBeInTheDocument();

    cleanup();
    const second = setup();
    await fill(second.user, "OldPassword1", "12345", "12345");
    await second.user.click(submit());
    expect(await screen.findByText("Use at least 6 characters.")).toBeInTheDocument();

    cleanup();
    const third = setup();
    await fill(third.user, "OldPassword1", "NewPassword2", "Different3");
    await third.user.click(submit());
    expect(await screen.findByText("The two new passwords do not match.")).toBeInTheDocument();
    expect(confirm()).toHaveAttribute("aria-invalid", "true");

    cleanup();
    const fourth = setup();
    await fill(fourth.user, "SamePassword1", "SamePassword1", "SamePassword1");
    await fourth.user.click(submit());
    expect(await screen.findByText(/different from your current one/)).toBeInTheDocument();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the passwords to Better Auth only, asks it to end other sessions, then clears the form", async () => {
    const { calls } = mockFetch({ body: { token: null, user: {} } });
    const { user } = setup();
    await fill(user, "OldPassword1", "NewPassword2", "NewPassword2");
    await user.click(submit());

    expect(await screen.findByText("Password changed")).toBeInTheDocument();
    expect(screen.getByText("Your other devices were signed out.")).toBeInTheDocument();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("/api/auth/change-password");
    expect(calls[0]!.init.method).toBe("POST");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      currentPassword: "OldPassword1",
      newPassword: "NewPassword2",
      revokeOtherSessions: true,
    });
    // The confirmation field is only a typing check; it is never sent.
    expect(calls[0]!.init.body as string).not.toContain("confirm");
    expect(current()).toHaveValue("");
    expect(next()).toHaveValue("");
    expect(confirm()).toHaveValue("");
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("shows 'incorrect current password' on that field, and keeps the typed values", async () => {
    mockFetch({ status: 400, body: { code: "INVALID_PASSWORD", message: "Invalid password" } });
    const { user } = setup();
    await fill(user, "WrongOne1", "NewPassword2", "NewPassword2");
    await user.click(submit());

    expect(await screen.findByText(PASSWORD_MESSAGES.wrongCurrent)).toBeInTheDocument();
    expect(current()).toHaveAttribute("aria-invalid", "true");
    expect(current()).toHaveAccessibleDescription(PASSWORD_MESSAGES.wrongCurrent);
    expect(next()).toHaveValue("NewPassword2");
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it.each([
    [
      "rate limiting",
      { status: 429, body: { message: "Too many requests" } },
      PASSWORD_MESSAGES.rateLimited,
    ],
    ["an ended session", { status: 401, body: {} }, PASSWORD_MESSAGES.signedOut],
    [
      "a server error",
      { status: 500, body: { message: "FATAL postgres://secret" } },
      PASSWORD_MESSAGES.unexpected,
    ],
    ["a network failure", new TypeError("Failed to fetch"), PASSWORD_MESSAGES.network],
  ] as const)("shows a safe message for %s", async (_name, reply, message) => {
    mockFetch(reply as Reply);
    const { user } = setup();
    await fill(user, "OldPassword1", "NewPassword2", "NewPassword2");
    await user.click(submit());
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/postgres|FATAL|Too many requests/);
  });

  it("never shows a password anywhere in the page text", async () => {
    mockFetch({ status: 400, body: { code: "INVALID_PASSWORD" } });
    const { user, container } = setup();
    await fill(user, "OldPassword1", "NewPassword2", "NewPassword2");
    await user.click(submit());
    await screen.findByText(PASSWORD_MESSAGES.wrongCurrent);
    expect(container.textContent).not.toMatch(/OldPassword1|NewPassword2/);
  });

  it("disables the form while changing, and sends one request however often it is submitted", async () => {
    let finish!: (reply: Reply) => void;
    const { fetchMock } = mockFetch(new Promise<Reply>((resolve) => (finish = resolve)));
    const { user } = setup();
    await fill(user, "OldPassword1", "NewPassword2", "NewPassword2");
    await user.click(submit());

    expect(screen.getByRole("button", { name: "Changing…" })).toBeDisabled();
    expect(current()).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => finish({ body: {} }));
    await waitFor(() => expect(current()).toHaveValue(""));
  });
});

describe("AccountSessions", () => {
  const setup = (list = sessions) => {
    const utils = render(wrap(<AccountSessions sessions={list} />));
    return { user: userEvent.setup(), ...utils };
  };

  it("lists each session with its device, times, and marks the current one", () => {
    setup();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Chrome on Windows");
    expect(within(items[0]!).getByText("This device")).toBeInTheDocument();
    expect(items[1]).toHaveTextContent("Safari on iOS");
    for (const item of items) {
      expect(item).toHaveTextContent("Signed in");
      expect(item).toHaveTextContent("Last active");
      expect(item.querySelectorAll("time")).toHaveLength(2);
    }
  });

  it("offers Sign out on other devices only, with unique button names", () => {
    setup();
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]!).queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out Safari on iOS, session 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out Safari on iOS, session 3" }),
    ).toBeInTheDocument();
  });

  it("says how many other devices are signed in", () => {
    setup();
    expect(screen.getByText("You are signed in on 2 other devices.")).toBeInTheDocument();
    cleanup();
    setup([sessions[0]!]);
    expect(screen.getByText("You are signed in on this device only.")).toBeInTheDocument();
  });

  it("asks before ending another session, and cancelling does nothing", async () => {
    const { fetchMock } = mockFetch({ body: { ok: true, sessionId: "sess_phone" } });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Sign out Safari on iOS, session 2" }));
    const confirmation = await screen.findByRole("alertdialog", { name: "Sign out this device?" });
    expect(confirmation).toHaveAccessibleDescription(/Safari on iOS will be signed out/);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ends the chosen session, toasts, and refreshes the list", async () => {
    const { calls } = mockFetch({ body: { ok: true, sessionId: "sess_phone" } });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Sign out Safari on iOS, session 2" }));
    await user.click(await screen.findByRole("button", { name: "Sign out device" }));

    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(calls[0]!.url).toBe("/api/admin/account/sessions/sess_phone");
    expect(calls[0]!.init.method).toBe("DELETE");
    expect(await screen.findByText("Session ended")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open with a safe error when ending a session fails", async () => {
    mockFetch({
      status: 500,
      body: { ok: false, message: "Something went wrong on our side. Please try again." },
    });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Sign out Safari on iOS, session 2" }));
    await user.click(await screen.findByRole("button", { name: "Sign out device" }));
    expect(
      (await screen.findAllByText(/Something went wrong on our side/)).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("explains the effect of 'Sign out everywhere' before doing anything", async () => {
    const { fetchMock } = mockFetch({ body: { status: true } });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    const confirmation = await screen.findByRole("alertdialog", { name: "Sign out everywhere?" });
    expect(confirmation).toHaveAccessibleDescription(
      /every session on every device, including this one/,
    );
    expect(confirmation).toHaveAccessibleDescription(/sign-in page/);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signs out everywhere through Better Auth and goes to the sign-in page", async () => {
    const { calls } = mockFetch({ body: { status: true } });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Sign out everywhere",
      }),
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin/login"));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("/api/auth/revoke-sessions");
    expect(calls[0]!.init.method).toBe("POST");
  });

  it("stays on the page, with a safe message, if signing out everywhere fails", async () => {
    mockFetch({ status: 500, body: { message: "FATAL postgres://secret" } });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Sign out everywhere",
      }),
    );

    expect(await screen.findByText(SESSION_MESSAGES.signOutFailed)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/postgres|FATAL/);
  });

  it("sends one request for repeated confirmations", async () => {
    let finish!: (reply: Reply) => void;
    const { fetchMock } = mockFetch(new Promise<Reply>((resolve) => (finish = resolve)));
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    const confirmButton = within(await screen.findByRole("alertdialog")).getByRole("button", {
      name: "Sign out everywhere",
    });
    await user.click(confirmButton);
    await user.click(confirmButton);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => finish({ body: { status: true } }));
  });
});
