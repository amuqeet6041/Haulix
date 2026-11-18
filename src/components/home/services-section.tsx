import { FileText, Handshake, Search, Truck, type LucideIcon } from "lucide-react";
import Image from "next/image";

import { ArrowLink } from "@/components/shared/arrow-link";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { landingSectionIds } from "@/config/navigation";
import { services, type TextItem } from "@/content/landing";
import { cn } from "@/lib/utils";

/** One icon per service, in the same order as `services.items`. */
const icons: LucideIcon[] = [Truck, Search, Handshake, FileText];

function ServiceTile({
  item,
  icon: Icon,
  featured = false,
  className,
}: {
  item: TextItem;
  icon: LucideIcon;
  featured?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative isolate flex h-full flex-col overflow-hidden rounded-panel border border-white/10 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-orange/50 hover:shadow-lift motion-reduce:hover:translate-y-0 sm:p-8",
        featured ? "min-h-[26rem] bg-ink-warm" : "bg-ink-warm/70",
        className,
      )}
    >
      {featured ? (
        <>
          <Image
            src="/images/general/truck-sunset-highway.jpg"
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="-z-20 object-cover object-[30%_50%] transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/10"
          />
        </>
      ) : null}
      <span
        className={cn(
          "inline-flex size-12 items-center justify-center rounded-xl",
          featured ? "bg-orange text-ink" : "bg-orange/15 text-orange",
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3
        className={cn(
          "font-medium tracking-[-0.03em]",
          featured ? "mt-auto pt-24 text-3xl sm:text-4xl" : "mt-6 text-2xl",
        )}
      >
        {item.title}
      </h3>
      <p
        className={cn(
          "mt-3 leading-relaxed",
          featured ? "max-w-sm text-base text-gray" : "text-sm text-subtle-foreground",
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
              <ServiceTile item={featured} icon={icons[0]!} featured />
            </Reveal>
          ) : null}
          {rest.map((item, i) => (
            <Reveal
              key={item.title}
              delay={(i + 1) * 0.05}
              className={cn(i === rest.length - 1 && "md:col-span-2")}
            >
              <ServiceTile item={item} icon={icons[i + 1] ?? Truck} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
