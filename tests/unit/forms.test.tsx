import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { carrierInquirySchema } from "@/validations";

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

  it("marks the optional phone field invalid when it is not a US number", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillContactForm(user);
    await user.type(screen.getByLabelText(/Phone/), "12345");

    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.getByLabelText(/Phone/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Phone/)).toHaveAttribute(
      "aria-describedby",
      "contact-phone-message",
    );
  });

  it("sends the general inquiry type and no server-managed fields", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true, message: "Thanks!" }));
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillContactForm(user);

    await user.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("status");

    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.inquiryType).toBe("GENERAL");
    for (const field of ["type", "status", "submissionId", "sourcePage", "ipHash"]) {
      expect(body).not.toHaveProperty(field);
    }
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

function sentRequest(fetchMock: ReturnType<typeof mockFetch>, index = 0) {
  const init = (fetchMock.mock.calls[index] as unknown as [string, RequestInit])[1];
  return {
    body: JSON.parse(String(init.body)) as Record<string, unknown>,
    headers: init.headers as Record<string, string>,
  };
}

describe("ContactForm lead fields", () => {
  it("offers every inquiry type, defaulting to a general question", () => {
    render(<ContactForm />);
    const select = screen.getByLabelText(/What can we help with/);
    expect(select).toHaveValue("GENERAL");
    expect(Array.from((select as HTMLSelectElement).options).map((option) => option.value)).toEqual(
      ["GENERAL", "DISPATCH_SERVICES", "PRICING", "EQUIPMENT", "PARTNERSHIP", "OTHER"],
    );
  });

  it("sends the chosen inquiry type with optional company, equipment and fleet size", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true, message: "Thanks!" }));
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillContactForm(user);
    await user.selectOptions(screen.getByLabelText(/What can we help with/), "PRICING");
    await user.type(screen.getByLabelText(/Company name/), "Driver Freight LLC");
    await user.selectOptions(screen.getByLabelText(/Equipment type/), "reefer");
    await user.type(screen.getByLabelText(/Number of trucks/), "4");

    await user.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("status");

    expect(sentRequest(fetchMock).body).toMatchObject({
      inquiryType: "PRICING",
      companyName: "Driver Freight LLC",
      equipment: "reefer",
      fleetSize: 4,
    });
  });

  it("leaves optional equipment and fleet size out when not filled in", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true, message: "Thanks!" }));
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillContactForm(user);

    await user.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("status");

    const { body } = sentRequest(fetchMock);
    expect(body.equipment).toBeUndefined();
    expect(body.fleetSize).toBeUndefined();
  });

  it("marks an invalid fleet size and does not submit", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true, message: "Thanks!" }));
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillContactForm(user);
    await user.type(screen.getByLabelText(/Number of trucks/), "0");

    await user.click(screen.getByRole("button", { name: "Send message" }));

    const fleetSize = screen.getByLabelText(/Number of trucks/);
    expect(fleetSize).toHaveAttribute("aria-invalid", "true");
    expect(fleetSize).toHaveAttribute("aria-describedby", "contact-fleet-size-message");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a server inquiry type error onto the topic field", async () => {
    mockFetch(
      jsonResponse(
        {
          ok: false,
          message: "Please check the highlighted fields.",
          fieldErrors: { inquiryType: ["Please choose a topic."] },
        },
        422,
      ),
    );
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillContactForm(user);

    await user.click(screen.getByRole("button", { name: "Send message" }));

    const select = await screen.findByLabelText(/What can we help with/);
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveFocus();
  });
});

describe("submission ids", () => {
  it("reuses the id when retrying a failed attempt and renews it after success", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse({ ok: true, message: "Thanks!" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, message: "Thanks!" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup({ delay: null });
    render(<ContactForm />);

    await fillContactForm(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("status");
    // Wait for the form reset that follows a success before typing the next message.
    await vi.waitFor(() => expect(screen.getByLabelText(/Email/)).toHaveValue(""));
    // A second, different message. (Retyping identical values after a programmatic reset does
    // not register in jsdom, because React's value tracker still holds the old value.)
    for (const [label, value] of [
      [/Full name/, "John Hauler"],
      [/Email/, "john@example.com"],
      [/Message/, "A second, separate message about dispatch."],
    ] as const) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    const ids = [0, 1, 2].map(
      (index) =>
        sentRequest(fetchMock as ReturnType<typeof mockFetch>, index).headers["Idempotency-Key"],
    );
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[0]);
    for (const index of [0, 1, 2]) {
      expect(sentRequest(fetchMock as ReturnType<typeof mockFetch>, index).body).not.toHaveProperty(
        "submissionId",
      );
    }
  });
});

describe("LeadForm", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  async function fillLeadForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/Full name/), "Jane Driver");
    await user.type(screen.getByLabelText(/^Email/), "jane@example.com");
    await user.type(screen.getByLabelText(/^Phone/), "(555) 123-4567");
    await user.selectOptions(screen.getByLabelText(/Equipment type/), "dry-van");
    await user.type(screen.getByLabelText(/Number of trucks/), "2");
  }

  it("sends exactly the carrierInquirySchema fields", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true, message: "Thanks!" }));
    const user = userEvent.setup();
    render(<LeadForm />);
    await fillLeadForm(user);
    await user.type(screen.getByLabelText(/Company name/), "Driver Freight LLC");
    await user.type(screen.getByLabelText(/MC number/), "123456");

    await user.click(screen.getByRole("button", { name: "Submit inquiry" }));
    await screen.findByRole("status");

    const { body, headers } = sentRequest(fetchMock);
    expect(Object.keys(body).sort()).toEqual(
      Object.keys(carrierInquirySchema.shape)
        .filter((key) => body[key] !== undefined)
        .sort(),
    );
    expect(body).toMatchObject({
      fullName: "Jane Driver",
      email: "jane@example.com",
      phone: "(555) 123-4567",
      equipment: "dry-van",
      fleetSize: 2,
      companyName: "Driver Freight LLC",
      mcNumber: "123456",
    });
    for (const key of Object.keys(body)) expect(carrierInquirySchema.shape).toHaveProperty(key);
    expect(headers["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("requires equipment and fleet size", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true, message: "Thanks!" }));
    const user = userEvent.setup();
    render(<LeadForm />);

    await user.click(screen.getByRole("button", { name: "Submit inquiry" }));

    expect(screen.getByLabelText(/Equipment type/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Number of trucks/)).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preselects equipment from ?equipment=", async () => {
    window.history.replaceState(null, "", "/get-started?equipment=reefer");
    render(<LeadForm />);
    await vi.waitFor(() => expect(screen.getByLabelText(/Equipment type/)).toHaveValue("reefer"));
  });

  it("ignores an unknown ?equipment= value", () => {
    window.history.replaceState(null, "", "/get-started?equipment=spaceship");
    render(<LeadForm />);
    expect(screen.getByLabelText(/Equipment type/)).toHaveValue("");
  });

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
