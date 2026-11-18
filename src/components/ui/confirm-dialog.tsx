"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Read by screen readers as the dialog's description. Say what will happen. */
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "destructive" styles the confirm button in the error color. */
  tone?: "default" | "destructive";
  /**
   * Runs when the person confirms. While it is pending both buttons are
   * disabled. The dialog closes when it finishes; if it throws, the dialog
   * stays open so the person can retry or cancel.
   */
  onConfirm: () => void | Promise<void>;
  /**
   * Where focus goes when the dialog closes. Defaults to whatever had focus
   * when it opened. Use it when the opener may no longer be usable afterwards
   * (for example a button that becomes disabled once the action succeeded).
   */
  returnFocus?: () => HTMLElement | null | undefined;
}

const destructiveButton =
  "border border-destructive/40 bg-destructive/15 text-destructive shadow-none hover:translate-y-0 hover:bg-destructive/25";

/**
 * Confirmation dialog for actions that need a second look (deleting a note,
 * marking a lead as spam). Built on Radix Dialog as an `alertdialog`, so it
 * traps focus, closes on Escape, hides the page from screen readers while open
 * and returns focus to whatever opened it.
 *
 * Focus starts on Cancel, the safe choice, so pressing Enter by reflex never
 * confirms a destructive action.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  returnFocus,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  /** What had focus when the dialog opened (usually the button that opened it). */
  const openerRef = React.useRef<HTMLElement | null>(null);
  const [pending, setPending] = React.useState(false);
  /** Set when the last confirmation failed, so focus can be restored after re-render. */
  const failedRef = React.useRef(false);

  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The caller reports the failure (usually with a toast); keep the dialog
      // open. Both buttons were disabled while pending, which dropped focus, so
      // put it back on the safe choice once they are enabled again.
      failedRef.current = true;
    } finally {
      setPending(false);
    }
  }

  // Runs after the re-render that re-enables the buttons (a disabled button
  // cannot take focus).
  React.useEffect(() => {
    if (!pending && failedRef.current) {
      failedRef.current = false;
      cancelRef.current?.focus();
    }
  }, [pending]);

  return (
    <DialogPrimitive.Root
      open={open}
      // A pending action cannot be dismissed by Escape or an outside click.
      onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/70 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          role="alertdialog"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            cancelRef.current?.focus();
          }}
          // This dialog is controlled and has no Radix trigger, so Radix would
          // leave focus on the page body. Send it back to the opener instead.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = returnFocus?.() ?? openerRef.current;
            if (target?.isConnected) target.focus();
            openerRef.current = null;
          }}
          className="fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-panel card-surface bg-ink-warm p-6 shadow-lift data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:p-7"
        >
          <DialogPrimitive.Title className="font-display text-xl font-bold text-foreground">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-gray">
            {description}
          </DialogPrimitive.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              ref={cancelRef}
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={tone === "destructive" ? "secondary" : "primary"}
              className={cn(tone === "destructive" && destructiveButton)}
              onClick={confirm}
              disabled={pending}
            >
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
