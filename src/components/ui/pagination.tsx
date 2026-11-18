import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Page numbers to show: always the first and last page, the current page and
 * its neighbours, with `"gap"` markers where pages are skipped.
 * pageWindow(10, 20) -> [1, "gap", 9, 10, 11, "gap", 20]
 */
export function pageWindow(page: number, totalPages: number, siblings = 1): (number | "gap")[] {
  const last = Math.max(1, Math.floor(totalPages));
  const current = Math.min(Math.max(1, Math.floor(page)), last);
  const shown = new Set<number>([1, last]);
  for (let p = current - siblings; p <= current + siblings; p++) {
    if (p >= 1 && p <= last) shown.add(p);
  }
  const pages = [...shown].sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  pages.forEach((p, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined) {
      if (p - previous === 2) result.push(previous + 1);
      else if (p - previous > 2) result.push("gap");
    }
    result.push(p);
  });
  return result;
}

const itemClasses =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-transparent px-2.5 text-sm font-semibold text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const interactiveClasses = "hover:border-cream/20 hover:bg-cream/5";
const currentClasses = "border-orange/40 bg-orange/15 text-orange";
const disabledClasses = "pointer-events-none opacity-40";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Total number of results, for the "Showing 26 to 50 of 120" summary. */
  total?: number;
  pageSize?: number;
  /** Link mode: returns the URL for a page (server-rendered lists, bookmarkable). */
  hrefFor?: (page: number) => string;
  /** Button mode: called with the chosen page (client-side lists). Ignored when `hrefFor` is set. */
  onPageChange?: (page: number) => void;
  className?: string;
  /** Accessible name of the navigation landmark. */
  label?: string;
}

/** Page navigation. Renders nothing when there is only one page and no summary to show. */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  hrefFor,
  onPageChange,
  className,
  label = "Pagination",
}: PaginationProps) {
  const last = Math.max(1, Math.floor(totalPages));
  const current = Math.min(Math.max(1, Math.floor(page)), last);
  const showSummary = total !== undefined && pageSize !== undefined && total > 0;
  if (last <= 1 && !showSummary) return null;

  const from = showSummary ? (current - 1) * pageSize + 1 : 0;
  const to = showSummary ? Math.min(current * pageSize, total) : 0;

  /** A previous, next or numbered control. Out-of-range targets render as disabled. */
  function control(target: number, content: React.ReactNode, ariaLabel: string) {
    const disabled = target < 1 || target > last;
    const className = cn(itemClasses, interactiveClasses);
    if (hrefFor) {
      // An anchor without an href is the standard way to show a disabled link:
      // it has the link role, takes the accessible name, and is announced as
      // dimmed/unavailable via aria-disabled, but it is not focusable or clickable.
      if (disabled) {
        return (
          <a
            role="link"
            aria-disabled="true"
            aria-label={ariaLabel}
            className={cn(className, disabledClasses)}
          >
            {content}
          </a>
        );
      }
      return (
        <Link href={hrefFor(target)} aria-label={ariaLabel} className={className}>
          {content}
        </Link>
      );
    }
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onPageChange?.(target)}
        className={cn(className, "disabled:pointer-events-none disabled:opacity-40")}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {showSummary ? (
        <p className="text-sm text-gray">
          Showing {from} to {to} of {total}
        </p>
      ) : (
        <span />
      )}
      {last > 1 ? (
        <nav aria-label={label}>
          <ul className="flex flex-wrap items-center gap-1">
            <li>
              {control(
                current - 1,
                <ChevronLeft className="size-4" aria-hidden="true" />,
                "Previous page",
              )}
            </li>
            {pageWindow(current, last).map((item, index) => (
              <li key={item === "gap" ? `gap-${index}` : item}>
                {item === "gap" ? (
                  <span className={cn(itemClasses, "text-gray")} aria-hidden="true">
                    …
                  </span>
                ) : item === current ? (
                  <span
                    aria-current="page"
                    aria-label={`Page ${item}, current page`}
                    className={cn(itemClasses, currentClasses)}
                  >
                    {item}
                  </span>
                ) : (
                  control(item, item, `Page ${item}`)
                )}
              </li>
            ))}
            <li>
              {control(
                current + 1,
                <ChevronRight className="size-4" aria-hidden="true" />,
                "Next page",
              )}
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
