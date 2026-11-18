import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  /** Kept for API compatibility: the site is dark-first, so this no longer changes colors. */
  onDark?: boolean;
  /** Heading level to render. Use "h1" only once per page. */
  as?: "h1" | "h2" | "h3";
  /** Id for the heading element, e.g. for a section's aria-labelledby. */
  id?: string;
  className?: string;
}

/** Short orange label above a heading. Sentence case, no rule or letter spacing. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm font-semibold text-orange", className)}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as: Heading = "h2",
  id,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <Eyebrow className="mb-5">{eyebrow}</Eyebrow> : null}
      <Heading
        id={id}
        className={
          Heading === "h3"
            ? "text-2xl font-medium tracking-[-0.035em] text-balance sm:text-3xl"
            : "heading-section"
        }
      >
        {title}
      </Heading>
      {description ? (
        <p className="mt-5 text-base leading-relaxed text-pretty text-subtle-foreground sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
