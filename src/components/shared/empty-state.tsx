import { Inbox, type LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Optional action, such as a button or link. */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-background text-brand-600 shadow-soft">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-xl">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
