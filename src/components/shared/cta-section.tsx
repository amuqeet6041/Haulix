import Image from "next/image";
import type { ReactNode } from "react";

import { Container } from "@/components/shared/container";
import { PrimaryButton } from "@/components/shared/primary-button";
import { Reveal } from "@/components/shared/reveal";
import { SecondaryButton } from "@/components/shared/secondary-button";
import { Eyebrow } from "@/components/shared/section-heading";
import { cn } from "@/lib/utils";

export interface CtaAction {
  label: string;
  href: string;
}

interface CtaSectionProps {
  title?: string;
  description?: string;
  eyebrow?: string;
  primary?: CtaAction;
  /** Pass `null` to show only the primary action. */
  secondary?: CtaAction | null;
  /** Decorative background photo. Without one, the band uses the ember gradient. */
  image?: { src: string; objectPosition?: string };
  /** Anchor id for the section, e.g. a landing nav target. */
  id?: string;
  /** Id of the heading, used for the section's aria-labelledby. */
  headingId?: string;
  /** "full" pads top and bottom; "bottom" when it follows another padded section. */
  spacing?: "full" | "bottom";
  /** Extra content under the actions, such as contact details. */
  children?: ReactNode;
  className?: string;
}

/** Closing call-to-action banner used at the bottom of marketing pages. */
export function CtaSection({
  title = "Ready to talk about dispatching?",
  description = "Tell us about your truck and the freight you run. Our team will follow up with you.",
  eyebrow,
  primary = { label: "Get Started", href: "/get-started" },
  secondary = { label: "Contact Us", href: "/contact" },
  image,
  id,
  headingId = "cta-title",
  spacing = "full",
  children,
  className,
}: CtaSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(spacing === "full" ? "section-y" : "section-b", className)}
    >
      <Container>
        <Reveal>
          <div
            className={cn(
              "relative isolate overflow-hidden rounded-banner border border-white/10",
              !image && "bg-ember",
            )}
          >
            {image ? (
              <>
                <Image
                  src={image.src}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 1216px, 100vw"
                  className="-z-20 object-cover"
                  style={{ objectPosition: image.objectPosition }}
                />
                <div aria-hidden="true" className="bg-banner-shade absolute inset-0 -z-10" />
              </>
            ) : null}
            <div className="px-6 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
              {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
              <h2
                id={headingId}
                className={cn(
                  "max-w-2xl text-4xl leading-[1.05] font-light tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl",
                  eyebrow && "mt-6",
                )}
              >
                {title}
              </h2>
              {description ? (
                <p className="mt-6 max-w-lg text-base leading-relaxed text-gray/85 sm:text-lg">
                  {description}
                </p>
              ) : null}
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton href={primary.href} size="xl">
                  {primary.label}
                </PrimaryButton>
                {secondary ? (
                  <SecondaryButton href={secondary.href} size="xl" className="px-8">
                    {secondary.label}
                  </SecondaryButton>
                ) : null}
              </div>
              {children ? <div className="mt-10 max-w-xl text-sm">{children}</div> : null}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
