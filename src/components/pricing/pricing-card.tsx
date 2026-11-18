import { Check } from "lucide-react";

import { PrimaryButton } from "@/components/shared/primary-button";
import { SecondaryButton } from "@/components/shared/secondary-button";
import type { PricingPlan } from "@/content/pricing";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  plan: PricingPlan;
  ctaHref?: string;
  ctaLabel?: string;
}

export function PricingCard({
  plan,
  ctaHref = "/get-started",
  ctaLabel = "Get Started",
}: PricingCardProps) {
  const Cta = plan.highlighted ? PrimaryButton : SecondaryButton;

  return (
    <article
      aria-labelledby={`plan-${plan.id}`}
      className={cn(
        "flex h-full flex-col rounded-panel card-surface p-7 transition-colors duration-300 hover:border-card-border-hover sm:p-8",
        plan.highlighted && "border-orange shadow-lift",
      )}
    >
      <h3 id={`plan-${plan.id}`} className="text-2xl font-semibold tracking-tight">
        {plan.name}
      </h3>
      <p className="mt-1.5 text-sm text-subtle-foreground">{plan.audience}</p>
      <div className="mt-7">
        <p className="font-display text-2xl font-light tracking-tight text-orange">
          {plan.priceLabel}
        </p>
        {plan.priceNote ? (
          <p className="mt-1 text-sm text-subtle-foreground">{plan.priceNote}</p>
        ) : null}
      </div>
      {plan.featuresLabel ? (
        <p className="mt-7 text-sm font-semibold text-white">{plan.featuresLabel}</p>
      ) : null}
      <ul
        className={cn("flex-1 space-y-3 text-sm text-gray", plan.featuresLabel ? "mt-4" : "mt-7")}
      >
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Cta href={ctaHref} className="mt-8 w-full">
        {ctaLabel}
      </Cta>
    </article>
  );
}
