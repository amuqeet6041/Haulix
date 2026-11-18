import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Loading placeholder block. Size it with className (h-4 w-32, size-10, ...).
 * It is hidden from assistive technology; wrap a group of skeletons in an
 * element with `role="status"` and a visually hidden "Loading" label (see
 * `SkeletonGroup`) so screen readers hear one message instead of nothing.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-cream/10 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

interface SkeletonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What is loading, announced to screen readers. */
  label?: string;
}

/** A set of skeletons announced once as "Loading ...". */
export function SkeletonGroup({
  label = "Loading",
  className,
  children,
  ...props
}: SkeletonGroupProps) {
  return (
    <div role="status" aria-busy="true" className={className} {...props}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
