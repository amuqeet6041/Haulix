import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface TrustBadgeProps {
  label: string;
  onDark?: boolean;
  className?: string;
}

/**
 * Small pill used to state who the service is for. Only use it for factual
 * statements. Do not add certifications or awards that have not been provided.
 */
export function TrustBadge({ label, onDark = false, className }: TrustBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium",
        onDark
          ? "border-white/15 bg-white/5 text-white"
          : "border-border bg-surface text-foreground",
        className,
      )}
    >
      <Check className="size-4 text-brand-500" aria-hidden="true" />
      {label}
    </span>
  );
}
