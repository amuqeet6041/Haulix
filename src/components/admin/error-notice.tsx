import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** An inline error for an admin page section that could not load. Announced as an alert. */
export function ErrorNotice({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children: ReactNode;
  /** Optional recovery action, such as a retry button. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-gray">{children}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
