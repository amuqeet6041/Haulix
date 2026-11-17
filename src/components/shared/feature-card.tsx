import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  /** Optional step number, e.g. for "How it works". */
  step?: number;
  className?: string;
}

export function FeatureCard({ title, description, icon: Icon, step, className }: FeatureCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-background p-6 shadow-soft transition-shadow duration-200 hover:shadow-lift",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-navy-900 text-brand-500">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}
      {step !== undefined ? (
        <span className="mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-navy-900 text-sm font-bold text-white">
          {step}
        </span>
      ) : null}
      <h3 className="text-lg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
