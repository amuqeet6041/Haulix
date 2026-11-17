import * as React from "react";

import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Narrow container for text-heavy content. */
  narrow?: boolean;
}

/** Centers content and applies consistent horizontal padding. */
export function Container({ narrow = false, className, ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full px-5 sm:px-8", narrow ? "max-w-3xl" : "max-w-7xl", className)}
      {...props}
    />
  );
}
