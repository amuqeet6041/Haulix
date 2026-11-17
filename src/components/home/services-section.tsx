import { ArrowLink } from "@/components/shared/arrow-link";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { landingSectionIds } from "@/config/navigation";
import { services, type TextItem } from "@/content/landing";
import { cn } from "@/lib/utils";

/** Decorative orange curve used on the featured card (echoes the logo swoosh). */
function SwooshLine() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 240"
      fill="none"
      className="pointer-events-none absolute inset-x-0 top-20 h-44 w-full text-orange"
      preserveAspectRatio="none"
    >
      <path
        d="M-10 220 C 80 210, 120 120, 200 130 S 320 40, 420 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.9"
      />
      <path
        d="M-10 240 C 90 235, 140 160, 220 165 S 330 90, 420 70"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.35"
      />
    </svg>
  );
}

function ServiceTile({
  item,
  index,
  featured = false,
  className,
}: {
  item: TextItem;
  index: number;
  featured?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-panel border border-white/10 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-orange/50 hover:shadow-lift sm:p-8",
        featured ? "bg-ember min-h-[26rem]" : "bg-ink-warm/70",
        className,
      )}
    >
      {featured ? <SwooshLine /> : null}
      <div className="relative flex items-start justify-between gap-4">
        <span className="font-display text-sm font-semibold tracking-[0.2em] text-orange">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <h3
        className={cn(
          "relative mt-auto pt-10 font-medium tracking-[-0.03em]",
          featured ? "text-3xl sm:text-4xl" : "text-2xl",
        )}
      >
        {item.title}
      </h3>
      <p
        className={cn(
          "relative mt-3 leading-relaxed text-subtle-foreground",
          featured ? "max-w-sm text-base" : "text-sm",
        )}
      >
        {item.description}
      </p>
    </article>
  );
}

export function ServicesSection() {
  const [featured, ...rest] = services.items;

  return (
    <section
      id={landingSectionIds.services}
      aria-labelledby="services-title"
      className="relative bg-ink-warm/40 section-y"
    >
      <Container>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <SectionHeading id="services-title" eyebrow={services.eyebrow} title={services.title} />
          </Reveal>
          <Reveal delay={0.05} className="max-w-sm">
            <p className="leading-relaxed text-subtle-foreground">{services.description}</p>
            <ArrowLink href="/get-started" tone="accent" icon="up-right" className="mt-4">
              Talk to a dispatcher
            </ArrowLink>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          {featured ? (
            <Reveal className="md:col-span-2 lg:col-span-1 lg:row-span-2">
              <ServiceTile item={featured} index={0} featured />
            </Reveal>
          ) : null}
          {rest.map((item, i) => (
            <Reveal
              key={item.title}
              delay={(i + 1) * 0.05}
              className={cn(i === rest.length - 1 && "md:col-span-2")}
            >
              <ServiceTile item={item} index={i + 1} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
