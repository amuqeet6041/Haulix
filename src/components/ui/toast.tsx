"use client";

import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Toast notifications, built in-house (no extra dependency).
 *
 * Screen readers: two live regions exist from the first render, because
 * announcements are only reliable when the region is already in the page.
 *   - success and info toasts go in a polite `role="status"` region, so they
 *     wait for the reader to finish speaking;
 *   - error toasts go in an assertive `role="alert"` region, so they interrupt.
 * Keyboard and pointer: hovering or focusing a toast pauses its timer, and
 * every toast has a labelled dismiss button. Errors stay longer than the rest.
 */

export type ToastTone = "success" | "info" | "error";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds before it closes. 0 keeps it until dismissed. */
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastInput, "title" | "tone">> {
  id: number;
  description?: string;
  duration: number;
}

export const DEFAULT_TOAST_MS = 5000;
export const ERROR_TOAST_MS = 8000;
export const MAX_TOASTS = 4;

interface ToastApi {
  /** Shows a toast and returns its id. */
  toast: (input: ToastInput) => number;
  success: (title: string, description?: string) => number;
  error: (title: string, description?: string) => number;
  info: (title: string, description?: string) => number;
  dismiss: (id: number) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = React.useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>.");
  return api;
}

const toneStyles: Record<ToastTone, { icon: typeof Info; classes: string; iconClasses: string }> = {
  success: { icon: CircleCheck, classes: "border-cream/25", iconClasses: "text-cream" },
  info: { icon: Info, classes: "border-orange-soft/35", iconClasses: "text-orange-soft" },
  error: { icon: TriangleAlert, classes: "border-destructive/50", iconClasses: "text-destructive" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const nextId = React.useRef(1);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(({ title, description, tone = "info", duration }: ToastInput) => {
    const id = nextId.current++;
    const item: ToastItem = {
      id,
      title,
      description,
      tone,
      duration: duration ?? (tone === "error" ? ERROR_TOAST_MS : DEFAULT_TOAST_MS),
    };
    setToasts((current) => [...current, item].slice(-MAX_TOASTS));
    return id;
  }, []);

  const api = React.useMemo<ToastApi>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ title, description, tone: "success" }),
      error: (title, description) => toast({ title, description, tone: "error" }),
      info: (title, description) => toast({ title, description, tone: "info" }),
    }),
    [toast, dismiss],
  );

  const polite = toasts.filter((item) => item.tone !== "error");
  const assertive = toasts.filter((item) => item.tone === "error");

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
        <div role="status" aria-live="polite" className="flex w-full max-w-sm flex-col gap-2">
          {polite.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>
        {/*
          The explicit aria-live matters: when a modal dialog is open, Radix hides
          the rest of the page from screen readers but keeps elements that carry
          an aria-live attribute. Without it, an error raised while a dialog is
          open (for example a failed confirmation) would not be announced.
        */}
        <div role="alert" aria-live="assertive" className="flex w-full max-w-sm flex-col gap-2">
          {assertive.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = React.useState(false);
  const { icon: Icon, classes, iconClasses } = toneStyles[item.tone];

  React.useEffect(() => {
    if (paused || item.duration <= 0) return;
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [paused, item.duration, item.id, onDismiss]);

  return (
    <div
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border bg-ink-warm p-4 text-sm shadow-lift",
        classes,
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", iconClasses)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{item.title}</p>
        {item.description ? <p className="mt-1 text-gray">{item.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="-m-1 rounded-md p-1 text-gray transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
