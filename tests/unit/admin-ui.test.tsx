import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, type ConfirmDialogProps } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import {
  DEFAULT_TOAST_MS,
  ERROR_TOAST_MS,
  MAX_TOASTS,
  ToastProvider,
  useToast,
} from "@/components/ui/toast";
import { badgeToneClasses, leadStatuses } from "@/content/lead-status";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function ToastButtons() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success("Saved", "The lead was updated.")}>success</button>
      <button onClick={() => toast.info("Heads up")}>info</button>
      <button onClick={() => toast.error("Could not save", "Please try again.")}>error</button>
      <button onClick={() => toast.toast({ title: "Sticky", duration: 0 })}>sticky</button>
    </>
  );
}

function renderToasts() {
  return render(
    <ToastProvider>
      <ToastButtons />
    </ToastProvider>,
  );
}

const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("Toast announcements", () => {
  beforeEach(() => vi.useFakeTimers());

  it("has both live regions in the page before any toast appears", () => {
    renderToasts();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("announces success and info politely, inside the status region", () => {
    renderToasts();
    press("success");
    press("info");
    const status = within(screen.getByRole("status"));
    expect(status.getByText("Saved")).toBeInTheDocument();
    expect(status.getByText("The lead was updated.")).toBeInTheDocument();
    expect(status.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("announces errors assertively, inside the alert region", () => {
    renderToasts();
    press("error");
    expect(within(screen.getByRole("alert")).getByText("Could not save")).toBeInTheDocument();
    expect(within(screen.getByRole("alert")).getByText("Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("closes a toast after its time, with errors staying longer", () => {
    renderToasts();
    press("success");
    press("error");

    act(() => void vi.advanceTimersByTime(DEFAULT_TOAST_MS - 1));
    expect(screen.getByText("Saved")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(1));
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();

    expect(screen.getByText("Could not save")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(ERROR_TOAST_MS - DEFAULT_TOAST_MS));
    expect(screen.queryByText("Could not save")).not.toBeInTheDocument();
  });

  it("keeps a toast with no duration until it is dismissed", () => {
    renderToasts();
    press("sticky");
    act(() => void vi.advanceTimersByTime(60_000));
    expect(screen.getByText("Sticky")).toBeInTheDocument();
  });

  it("pauses while hovered or focused and restarts when left", () => {
    renderToasts();
    press("success");
    const card = screen.getByText("Saved").closest("div[class*='rounded-xl']") as HTMLElement;

    fireEvent.pointerEnter(card);
    act(() => void vi.advanceTimersByTime(DEFAULT_TOAST_MS * 3));
    expect(screen.getByText("Saved")).toBeInTheDocument();

    fireEvent.pointerLeave(card);
    act(() => void vi.advanceTimersByTime(DEFAULT_TOAST_MS));
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("can be dismissed with a labelled button", () => {
    renderToasts();
    press("success");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it(`shows at most ${MAX_TOASTS} at once, dropping the oldest`, () => {
    renderToasts();
    for (let i = 0; i < MAX_TOASTS + 2; i++) press("info");
    expect(screen.getAllByText("Heads up")).toHaveLength(MAX_TOASTS);
  });

  it("throws a helpful error when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ToastButtons />)).toThrow(/ToastProvider/);
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// ConfirmDialog
// ---------------------------------------------------------------------------

function DialogHarness(
  props: Partial<ConfirmDialogProps> & { onConfirm: () => void | Promise<void> },
) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Delete note</button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this note?"
        description="The note will be removed. This cannot be undone."
        confirmLabel="Delete"
        {...props}
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("is an accessible alert dialog with a name and description", async () => {
    const u = userEvent.setup();
    render(<DialogHarness onConfirm={vi.fn()} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "Delete note" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete this note?" });
    expect(dialog).toHaveAccessibleDescription("The note will be removed. This cannot be undone.");
  });

  it("puts focus on Cancel, the safe choice, when it opens", async () => {
    const u = userEvent.setup();
    render(<DialogHarness onConfirm={vi.fn()} />);
    await u.click(screen.getByRole("button", { name: "Delete note" }));
    await screen.findByRole("alertdialog");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("keeps keyboard focus inside while open", async () => {
    const u = userEvent.setup();
    render(<DialogHarness onConfirm={vi.fn()} />);
    await u.click(screen.getByRole("button", { name: "Delete note" }));
    const dialog = await screen.findByRole("alertdialog");

    for (let i = 0; i < 6; i++) {
      await u.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await u.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("confirms: runs the action once, then closes and returns focus to the opener", async () => {
    const u = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DialogHarness onConfirm={onConfirm} />);
    const opener = screen.getByRole("button", { name: "Delete note" });
    await u.click(opener);
    await u.click(await screen.findByRole("button", { name: "Delete" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it("cancels: closes without running the action", async () => {
    const u = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DialogHarness onConfirm={onConfirm} />);
    const opener = screen.getByRole("button", { name: "Delete note" });
    await u.click(opener);
    await u.click(await screen.findByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onConfirm).not.toHaveBeenCalled();
    expect(opener).toHaveFocus();
  });

  it("cancels on Escape without running the action", async () => {
    const u = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DialogHarness onConfirm={onConfirm} />);
    await u.click(screen.getByRole("button", { name: "Delete note" }));
    await screen.findByRole("alertdialog");
    await u.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not confirm when Enter is pressed straight after opening", async () => {
    const u = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DialogHarness onConfirm={onConfirm} />);
    await u.click(screen.getByRole("button", { name: "Delete note" }));
    await screen.findByRole("alertdialog");
    await u.keyboard("{Enter}");

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables both buttons and ignores Escape while the action is running", async () => {
    const u = userEvent.setup();
    let finish!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<DialogHarness onConfirm={onConfirm} />);
    await u.click(screen.getByRole("button", { name: "Delete note" }));
    await u.click(await screen.findByRole("button", { name: "Delete" }));

    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await u.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await act(async () => finish());
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("stays open and lets the person retry when the action fails", async () => {
    const u = userEvent.setup();
    const onConfirm = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(undefined);
    render(<DialogHarness onConfirm={onConfirm} />);
    await u.click(screen.getByRole("button", { name: "Delete note" }));
    await u.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("puts keyboard focus back on Cancel when the action fails, so the person can retry", async () => {
    const u = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error("network"));
    render(<DialogHarness onConfirm={onConfirm} />);
    await u.click(screen.getByRole("button", { name: "Delete note" }));
    await screen.findByRole("alertdialog");

    // Move focus to Confirm and activate it with the keyboard.
    await u.tab();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
    await u.keyboard("{Enter}");

    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("does not move focus after a successful confirmation", async () => {
    const u = userEvent.setup();
    render(<DialogHarness onConfirm={vi.fn()} />);
    const opener = screen.getByRole("button", { name: "Delete note" });
    await u.click(opener);
    await u.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it("keeps error toasts announceable while the dialog hides the rest of the page", async () => {
    vi.useRealTimers();
    function Harness() {
      const toast = useToast();
      return (
        <DialogHarness
          onConfirm={() => {
            toast.error("Could not delete", "Please try again.");
            throw new Error("network");
          }}
        />
      );
    }
    const u = userEvent.setup();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    const opener = screen.getByRole("button", { name: "Delete note" });
    await u.click(opener);
    await u.click(await screen.findByRole("button", { name: "Delete" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Could not delete")).toBeInTheDocument();
    // While the modal is open the rest of the page is hidden from screen readers
    // (positive control), but the live regions are not.
    expect(opener.closest("[aria-hidden='true']")).not.toBeNull();
    expect(alert.closest("[aria-hidden='true']")).toBeNull();
    expect(screen.getByRole("status").closest("[aria-hidden='true']")).toBeNull();
  });

  it("uses custom button labels and the destructive style when asked", async () => {
    const u = userEvent.setup();
    render(
      <DialogHarness
        onConfirm={vi.fn()}
        tone="destructive"
        confirmLabel="Mark as spam"
        cancelLabel="Keep lead"
      />,
    );
    await u.click(screen.getByRole("button", { name: "Delete note" }));
    expect(await screen.findByRole("button", { name: "Keep lead" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as spam" }).className).toContain(
      "text-destructive",
    );
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe("Pagination", () => {
  it("renders nothing for a single page with no summary", () => {
    const { container } = render(<Pagination page={1} totalPages={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows only the summary for a single page of results", () => {
    render(<Pagination page={1} totalPages={1} total={7} pageSize={25} />);
    expect(screen.getByText("Showing 1 to 7 of 7")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("summarizes the current range", () => {
    render(
      <Pagination
        page={3}
        totalPages={5}
        total={120}
        pageSize={25}
        hrefFor={(p) => `?page=${p}`}
      />,
    );
    expect(screen.getByText("Showing 51 to 75 of 120")).toBeInTheDocument();
  });

  it("links to pages in link mode and marks the current one", () => {
    render(<Pagination page={2} totalPages={4} hrefFor={(p) => `/admin/leads?page=${p}`} />);
    const nav = within(screen.getByRole("navigation", { name: "Pagination" }));

    expect(nav.getByRole("link", { name: "Previous page" })).toHaveAttribute(
      "href",
      "/admin/leads?page=1",
    );
    expect(nav.getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/admin/leads?page=3",
    );
    expect(nav.getByRole("link", { name: "Page 4" })).toHaveAttribute(
      "href",
      "/admin/leads?page=4",
    );
    const current = nav.getByText("2");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveAccessibleName("Page 2, current page");
    expect(nav.queryByRole("link", { name: /current page/ })).not.toBeInTheDocument();
  });

  it("disables previous on the first page and next on the last, in link mode", () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={3} hrefFor={(p) => `?page=${p}`} />,
    );
    const previous = screen.getByRole("link", { name: "Previous page" });
    expect(previous).toHaveAttribute("aria-disabled", "true");
    expect(previous).not.toHaveAttribute("href");

    rerender(<Pagination page={3} totalPages={3} hrefFor={(p) => `?page=${p}`} />);
    const next = screen.getByRole("link", { name: "Next page" });
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next).not.toHaveAttribute("href");
  });

  it("gives disabled link-mode controls valid semantics and keeps their look", () => {
    render(<Pagination page={1} totalPages={3} hrefFor={(p) => `?page=${p}`} />);
    const previous = screen.getByRole("link", { name: "Previous page" });
    // The link role and aria-disabled make it announced as an unavailable link,
    // not an unlabeled generic element.
    expect(previous).toHaveAttribute("role", "link");
    expect(previous).toHaveAccessibleName("Previous page");
    // Same dimmed, inert look as before.
    expect(previous).toHaveClass("pointer-events-none", "opacity-40", "h-9", "min-w-9");
    // An enabled control is a normal link with an href and no aria-disabled.
    const enabled = screen.getByRole("link", { name: "Next page" });
    expect(enabled).toHaveAttribute("href", "?page=2");
    expect(enabled).not.toHaveAttribute("aria-disabled");
  });

  it("skips disabled link-mode controls when tabbing", async () => {
    const u = userEvent.setup();
    render(<Pagination page={1} totalPages={3} hrefFor={(p) => `?page=${p}`} />);
    await u.tab();
    expect(screen.getByRole("link", { name: "Page 2" })).toHaveFocus();
    expect(screen.getByRole("link", { name: "Previous page" })).not.toHaveFocus();
  });

  it("calls onPageChange in button mode and disables the ends", async () => {
    const u = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />);

    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await u.click(screen.getByRole("button", { name: "Next page" }));
    await u.click(screen.getByRole("button", { name: "Page 5" }));
    expect(onPageChange.mock.calls).toEqual([[2], [5]]);
  });

  it("is reachable and operable with the keyboard", async () => {
    const u = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);

    await u.tab();
    expect(screen.getByRole("button", { name: "Previous page" })).toHaveFocus();
    await u.keyboard("{Enter}");
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("collapses long ranges with hidden gap markers", () => {
    render(<Pagination page={10} totalPages={20} onPageChange={() => {}} />);
    const nav = within(screen.getByRole("navigation", { name: "Pagination" }));
    expect(nav.getByRole("button", { name: "Page 20" })).toBeInTheDocument();
    expect(nav.queryByRole("button", { name: "Page 5" })).not.toBeInTheDocument();
    expect(nav.getAllByText("…")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Badge and Skeleton
// ---------------------------------------------------------------------------

describe("Badge", () => {
  it("renders its text with the tone's palette classes", () => {
    render(<Badge tone="accent">New</Badge>);
    const badge = screen.getByText("New");
    for (const name of badgeToneClasses.accent.split(" ")) expect(badge).toHaveClass(name);
  });

  it("supports every status tone", () => {
    for (const status of leadStatuses) {
      const { unmount } = render(<Badge tone={status.tone}>{status.label}</Badge>);
      expect(screen.getByText(status.label)).toBeInTheDocument();
      unmount();
    }
  });

  it("hides the decorative dot from assistive technology", () => {
    render(<Badge dot>Contacted</Badge>);
    const badge = screen.getByText("Contacted");
    expect(badge.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(badge).toHaveTextContent("Contacted");
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive technology and respects reduced motion", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const block = container.firstElementChild!;
    expect(block).toHaveAttribute("aria-hidden", "true");
    expect(block).toHaveClass("h-4", "w-32", "motion-reduce:animate-none");
  });

  it("announces a group of skeletons once", () => {
    render(
      <SkeletonGroup label="Loading leads">
        <Skeleton className="h-4" />
        <Skeleton className="h-4" />
      </SkeletonGroup>,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading leads");
  });
});
