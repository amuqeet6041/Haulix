import * as React from "react";

import { badgeToneClasses, type BadgeTone } from "@/content/lead-status";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color treatment. All tones use palette colors and their alpha tints only. */
  tone?: BadgeTone;
  /** Shows a small dot before the text. Decorative: the text always carries the meaning. */
  dot?: boolean;
}

/**
 * Small status pill. Meaning is always in the text, never in color alone, so
 * it stays readable for color-blind users and in forced-colors mode.
 */
export function Badge({ tone = "muted", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        badgeToneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
