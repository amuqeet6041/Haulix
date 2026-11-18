import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";

import { EquipmentIllustration } from "@/components/services/equipment-illustration";
import { Container } from "@/components/shared/container";
import { CtaSection } from "@/components/shared/cta-section";
import { PageHeader } from "@/components/shared/page-header";
import { Reveal } from "@/components/shared/reveal";
import { equipmentPage } from "@/content/equipment-page";
import { equipmentCategories } from "@/content/landing";
import { equipmentServices } from "@/content/services";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Equipment We Dispatch",
  description:
    "Truck dispatching for dry van, reefer, box truck, flatbed, step deck, hotshot and power only equipment. See how HAULIX handles dispatch for your trailer.",
  path: "/equipment",
});

export default function EquipmentPage() {
  const { header, categories, notListed, cta } = equipmentPage;

  return (
    <>
      <PageHeader
        photo="sunset"
        eyebrow={header.eyebrow}
        title={header.title}
        description={header.description}
        breadcrumbs={[{ label: "Equipment", href: "/equipment" }]}
      />

      {/* Category jump links */}
      <nav aria-label="Equipment categories" className="bg-ink-warm/60">
        <Container>
          <ul className="flex flex-wrap gap-x-8 gap-y-3 py-5 text-sm font-medium">
            {categories.map((group) => (
              <li key={group.id}>
                <a
                  href={`#${group.id}`}
                  className="inline-flex items-center gap-2 text-gray transition-colors hover:text-orange"
                >
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-orange" />
                  {group.title}
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </nav>

      {categories.map((group, groupIndex) => {
        const items = equipmentServices.filter(
          (service) => equipmentCategories[service.slug] === group.category,
        );
        return (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-title`}
            className={groupIndex === 0 ? "scroll-mt-24 section-y" : "scroll-mt-24 section-b"}
          >
            <Container>
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
                <Reveal className="lg:col-span-4">
                  <div className="lg:sticky lg:top-28">
                    <p className="text-sm font-semibold text-orange">
                      {items.length} {items.length === 1 ? "type" : "types"}
                    </p>
                    <h2
                      id={`${group.id}-title`}
                      className="mt-4 text-3xl font-medium tracking-[-0.035em] sm:text-4xl"
                    >
                      {group.title}
                    </h2>
                    <p className="mt-4 max-w-sm leading-relaxed text-subtle-foreground">
                      {group.description}
                    </p>
                  </div>
                </Reveal>

                <ul className="grid gap-5 lg:col-span-8">
                  {items.map((service, index) => (
                    <li key={service.slug}>
                      <Reveal delay={index * 0.05}>
                        <article
                          aria-labelledby={`${service.slug}-title`}
                          className="group grid gap-6 rounded-panel card-surface p-7 transition-colors duration-300 hover:border-card-border-hover sm:p-8 md:grid-cols-[1fr_15rem]"
                        >
                          <div>
                            <div className="flex h-28 max-w-xs items-center justify-center rounded-xl bg-ink/60 px-4 py-3">
                              <EquipmentIllustration slug={service.slug} />
                            </div>
                            <h3
                              id={`${service.slug}-title`}
                              className="mt-5 text-2xl font-semibold tracking-tight"
                            >
                              {service.name.replace(/ Dispatch$/, "")}
                            </h3>
                            <p className="mt-1 text-sm font-medium text-orange-soft">
                              {service.shortDescription}
                            </p>
                            <p className="mt-3 leading-relaxed text-subtle-foreground">
                              {service.description}
                            </p>
                            <Link
                              href={`/services/${service.slug}`}
                              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-colors hover:text-orange"
                            >
                              {service.name} details
                              <ArrowUpRight className="size-4" aria-hidden="true" />
                            </Link>
                          </div>
                          <ul className="space-y-3 text-sm text-gray md:pt-2">
                            {service.highlights.map((highlight) => (
                              <li key={highlight} className="flex items-start gap-2.5">
                                <Check
                                  className="mt-0.5 size-4 shrink-0 text-orange"
                                  aria-hidden="true"
                                />
                                <span>{highlight}</span>
                              </li>
                            ))}
                          </ul>
                        </article>
                      </Reveal>
                    </li>
                  ))}
                </ul>
              </div>
            </Container>
          </section>
        );
      })}

      {/* Not listed */}
      <section aria-labelledby="not-listed-title" className="section-b">
        <Container>
          <Reveal>
            <div className="flex flex-col gap-6 rounded-panel border border-dashed border-white/15 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div>
                <h2 id="not-listed-title" className="text-2xl font-semibold tracking-tight">
                  {notListed.title}
                </h2>
                <p className="mt-2 max-w-xl leading-relaxed text-subtle-foreground">
                  {notListed.description}
                </p>
              </div>
              <Link
                href={notListed.cta.href}
                className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-orange underline-offset-4 hover:underline"
              >
                {notListed.cta.label}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                />
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>

      <CtaSection
        headingId="equipment-cta-title"
        spacing="bottom"
        title={cta.title}
        description={cta.description}
        image={{ src: "/images/general/truck-sunset-highway.jpg", objectPosition: "40% 50%" }}
      />
    </>
  );
}
