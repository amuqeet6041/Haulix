"use client";

import { useSyncExternalStore } from "react";

const OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

/** Formats an ISO time; `timeZone` undefined means the viewer's own zone. */
export function formatAdminTime(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", { ...OPTIONS, timeZone }).format(date);
}

const noSubscription = () => () => {};

/**
 * A timestamp shown in the viewer's own time zone. The server cannot know
 * that zone, so the server render (and hydration) use UTC, marked as such;
 * React then re-renders with local time in the browser. Using
 * useSyncExternalStore's server snapshot keeps hydration mismatch-free.
 */
export function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const inBrowser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const text = inBrowser ? formatAdminTime(iso) : `${formatAdminTime(iso, "UTC")} UTC`;

  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
