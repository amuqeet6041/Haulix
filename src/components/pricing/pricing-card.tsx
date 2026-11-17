import { Check } from "lucide-react";

import { PrimaryButton } from "@/components/shared/primary-button";
import { SecondaryButton } from "@/components/shared/secondary-button";
import type { PricingPlan } from "@/content/pricing";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  plan: PricingPlan;
  ctaHref?: string;
}

export function PricingCard({ plan, ctaHref = "/get-started" }: PricingCardProps) {
  const Cta = plan.highlighted ? PrimaryButton : SecondaryButton;

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-background p-7 shadow-soft",
        plan.highlighted ? "border-brand-600 shadow-lift" : "border-border",
      )}
    >
      <h3 className="text-xl">{plan.name}</h3>
      <p className="mt-1 text-sm">{plan.audience}</p>
      <p className="mt-6 text-2xl font-bold text-foreground">{plan.priceLabel}</p>
      {plan.priceNote ? (
        <p className="mt-1 text-sm text-subtle-foreground">{plan.priceNote}</p>
      ) : null}
      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Cta href={ctaHref} className="mt-8 w-full">
        Get Started
      </Cta>
    </div>
  );
}
