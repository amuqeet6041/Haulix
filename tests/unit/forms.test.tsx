import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContactForm } from "@/components/forms/contact-form";
import { LeadForm } from "@/components/forms/lead-form";
import {
  NETWORK_ERROR_MESSAGE,
  SERVER_ERROR_MESSAGE,
  UNEXPECTED_RESPONSE_MESSAGE,
  usePostJson,
} from "@/hooks/use-post-json";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(response: Response | Promise<Response> | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("usePostJson", () => {
  it("returns field errors from a 422 response", async () => {
    mockFetch(
      jsonResponse(
        {
          ok: false,
          message: "Please check the highlighted fields.",
          fieldErrors: { email: ["Bad"] },
        },
        422,
      ),
    );
    const { result } = renderHook(() => usePostJson("/api/test"));

    let outcome: Awaited<ReturnType<typeof result.current.submit>> | undefined;
    await act(async () => {
      outcome = await result.current.submit({});
    });

    expect(outcome).toEqual({ ok: false, fieldErrors: { email: ["Bad"] } });
    expect(result.current.status).toBe("error");
    expect(result.current.fieldErrors).toEqual({ email: ["Bad"] });
  });

  it("explains a non-JSON server error instead of blaming the connection", async () => {
    mockFetch(new Response("<html>Internal Server Error</html>", { status: 502 }));
    const { result } = renderHook(() => usePostJson("/api/test"));

    await act(async () => {
      await result.current.submit({});
    });

    expect(result.current.status).toBe("error");
    expect(result.current.message).toBe(SERVER_ERROR_MESSAGE);
  });

  it("treats an unexpected 2xx body as an error", async () => {
    mockFetch(new Response("OK", { status: 200 }));
    const { result } = renderHook(() => usePostJson("/api/test"));

    await act(async () => {
      await result.current.submit({});
    });

    expect(result.current.status).toBe("error");
    expect(result.current.message).toBe(UNEXPECTED_RESPONSE_MESSAGE);
  });

  it("reports a network failure", async () => {
    mockFetch(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => usePostJson("/api/test"));

    await act(async () => {
      await result.current.submit({});
    });

    expect(result.current.message).toBe(NETWORK_ERROR_MESSAGE);
  });
});

async function fillContactForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Full name/), "Jane Driver");
  await user.type(screen.getByLabelText(/Email/), "jane@example.com");
  await user.type(screen.getByLabelText(/Subject/), "Dispatch question");
  await user.type(screen.getByLabelText(/Message/), "I would like to know more about dispatch.");
}

describe("ContactForm", () => {
  it("maps server field errors onto the matching fields and focuses the first", async () => {
    mockFetch(
      jsonResponse(
        {
          ok: false,
          message: "Please check the highlighted fields.",
          fieldErrors: { subject: ["Please add a short subject."], website: ["ignored"] },
        },
        422,
      ),
    );
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillContactForm(user);

    await user.click(screen.getByRole("button", { name: "Send message" }));

    const subject = await screen.findByLabelText(/Subject/);
    expect(subject).toHaveAttribute("aria-invalid", "true");
    expect(subject).toHaveAttribute("aria-describedby", "contact-subject-message");
    expect(subject).toHaveFocus();
    const alerts = screen.getAllByRole("alert").map((node) => node.textContent);
    expect(alerts).toContain("Please add a short subject.");
    expect(alerts).toContain("Please check the highlighted fields.");
    expect(screen.queryByText("ignored")).not.toBeInTheDocument();
  });

  it("marks the phone field invalid when it is too long", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillContactForm(user);
    await user.type(screen.getByLabelText(/Phone/), "1".repeat(31));

    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.getByLabelText(/Phone/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Phone/)).toHaveAttribute(
      "aria-describedby",
      "contact-phone-message",
    );
  });

  it("disables the button while sending and announces success", async () => {
    let resolve: (response: Response) => void = () => {};
    mockFetch(new Promise<Response>((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillContactForm(user);

    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();

    await act(async () => {
      resolve(jsonResponse({ ok: true, message: "Thanks! Your message has been sent." }));
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Thanks! Your message has been sent.",
    );
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
    expect(screen.getByLabelText(/Full name/)).toHaveValue("");
  });

  it("shows the 503 message as an alert", async () => {
    mockFetch(
      jsonResponse(
        { ok: false, message: "This form is not available yet. Please try again later." },
        503,
      ),
    );
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillContactForm(user);

    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This form is not available yet");
    expect(screen.getByLabelText(/Full name/)).toHaveValue("Jane Driver");
  });
});

describe("LeadForm", () => {
  it("maps a server phone error onto the phone field", async () => {
    mockFetch(
      jsonResponse(
        {
          ok: false,
          message: "Please check the highlighted fields.",
          fieldErrors: { phone: ["Please enter a valid US phone number."] },
        },
        422,
      ),
    );
    const user = userEvent.setup();
    render(<LeadForm />);
    await user.type(screen.getByLabelText(/Full name/), "Jane Driver");
    await user.type(screen.getByLabelText(/^Email/), "jane@example.com");
    await user.type(screen.getByLabelText(/^Phone/), "(555) 123-4567");
    await user.selectOptions(screen.getByLabelText(/Equipment type/), "dry-van");
    await user.type(screen.getByLabelText(/Number of trucks/), "2");

    await user.click(screen.getByRole("button", { name: "Submit inquiry" }));

    const phone = await screen.findByLabelText(/^Phone/);
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveFocus();
    expect(screen.getByText("Please enter a valid US phone number.")).toHaveAttribute(
      "role",
      "alert",
    );
  });
});
