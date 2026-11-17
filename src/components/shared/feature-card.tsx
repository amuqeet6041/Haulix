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

/** Icon or numbered step card for feature and process grids. */
export function FeatureCard({ title, description, icon: Icon, step, className }: FeatureCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl card-surface p-6 transition-colors duration-300 hover:border-card-border-hover",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-brown text-orange">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}
      {step !== undefined ? (
        <span className="mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-brown text-sm font-bold text-orange">
          {step}
        </span>
      ) : null}
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-subtle-foreground">{description}</p>
    </div>
  );
}
