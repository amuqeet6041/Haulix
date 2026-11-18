import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import {
  GENERIC_SIGN_IN_ERROR,
  LOGIN_NOTICES,
  RATE_LIMITED_ERROR,
  UNAVAILABLE_ERROR,
} from "@/content/admin-login";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

type Route = { status: number; body?: unknown };

/** Fake fetch keyed by path; records calls. */
function mockServer(routes: Record<string, Route | Route[]>) {
  const calls: { path: string; init?: RequestInit }[] = [];
  const queues = Object.fromEntries(
    Object.entries(routes).map(([path, value]) => [
      path,
      Array.isArray(value) ? [...value] : [value],
    ]),
  );
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    calls.push({ path, init });
    const queue = queues[path];
    const route = queue && (queue.length > 1 ? queue.shift()! : queue[0]!);
    if (!route) throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify(route.body ?? {}), {
      status: route.status,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

async function fill(user: ReturnType<typeof userEvent.setup>, email: string, password: string) {
  if (email) await user.type(screen.getByLabelText(/^Email/), email);
  if (password) await user.type(screen.getByLabelText(/^Password/), password);
}

beforeEach(() => {
  router.replace.mockReset();
  router.refresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AdminLoginForm", () => {
  it("renders labelled email and password fields and a sign-in button", () => {
    render(<AdminLoginForm />);
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("shows and hides the password with an accessible toggle", async () => {
    const user = userEvent.setup();
    render(<AdminLoginForm />);
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("type", "text");
    const hide = screen.getByRole("button", { name: "Hide password" });
    expect(hide).toHaveAttribute("aria-pressed", "true");

    await user.click(hide);
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("type", "password");
  });

  it("validates accessibly before contacting the server", async () => {
    const { fetchMock } = mockServer({});
    const user = userEvent.setup();
    render(<AdminLoginForm />);
    await user.type(screen.getByLabelText(/^Email/), "not-an-email");

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const email = screen.getByLabelText(/^Email/);
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "admin-email-message");
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a valid email address.")).toHaveAttribute("role", "alert");
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signs in, confirms admin access and goes to the dashboard", async () => {
    const { calls } = mockServer({
      "/api/auth/sign-in/email": { status: 200, body: { user: {} } },
      "/api/admin/me": { status: 200, body: { ok: true } },
    });
    const user = userEvent.setup();
    render(<AdminLoginForm />);
    await fill(user, "Admin@HaulixLogistics.com", "a-password");

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin"));
    expect(calls.map((c) => c.path)).toEqual(["/api/auth/sign-in/email", "/api/admin/me"]);
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({
      email: "admin@haulixlogistics.com",
      password: "a-password",
    });
  });

  it("shows a loading state while signing in", async () => {
    let release: (value: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => (release = resolve))),
    );
    const user = userEvent.setup();
    render(<AdminLoginForm />);
    await fill(user, "admin@haulixlogistics.com", "a-password");

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Signing in…" }).closest("form")).toHaveAttribute(
      "aria-busy",
      "true",
    );

    await act(async () => release(new Response("{}", { status: 401 })));
    expect(await screen.findByRole("alert")).toHaveTextContent(GENERIC_SIGN_IN_ERROR);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it.each([401, 403, 400])("shows one generic message for a %s from sign-in", async (status) => {
    mockServer({ "/api/auth/sign-in/email": { status, body: { message: "User not found" } } });
    const user = userEvent.setup();
    render(<AdminLoginForm />);
    await fill(user, "someone@example.com", "a-password");

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(GENERIC_SIGN_IN_ERROR);
    expect(alert).not.toHaveTextContent(/not found|exist|banned/i);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("signs a non-admin back out and shows the same generic message", async () => {
    const { calls } = mockServer({
      "/api/auth/sign-in/email": { status: 200 },
      "/api/admin/me": { status: 403, body: { code: "forbidden" } },
      "/api/auth/sign-out": { status: 200 },
    });
    const user = userEvent.setup();
    render(<AdminLoginForm />);
    await fill(user, "carrier@example.com", "a-password");

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(GENERIC_SIGN_IN_ERROR);
    expect(calls.map((c) => c.path)).toContain("/api/auth/sign-out");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("explains rate limiting and unavailability", async () => {
    mockServer({ "/api/auth/sign-in/email": [{ status: 429 }, { status: 503 }] });
    const user = userEvent.setup();
    render(<AdminLoginForm />);
    await fill(user, "admin@haulixlogistics.com", "a-password");

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(RATE_LIMITED_ERROR);

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await vi.waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(UNAVAILABLE_ERROR));
  });

  it("shows a redirect notice as a status message", () => {
    render(<AdminLoginForm notice={LOGIN_NOTICES.denied} />);
    expect(screen.getByRole("status")).toHaveTextContent("cannot access the admin area");
  });
});
