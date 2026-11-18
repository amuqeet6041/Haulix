import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { DispatchServiceIcon } from "@/components/services/dispatch-service-icon";
import { Container } from "@/components/shared/container";
import { CtaSection } from "@/components/shared/cta-section";
import { PageHeader } from "@/components/shared/page-header";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { dispatchServices, servicesPage } from "@/content/dispatch-services";
import { equipmentServices } from "@/content/services";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Truck Dispatch Services",
  description:
    "Load searching, rate negotiation, route planning, broker communication, dispatch management and paperwork for owner-operators and small fleets.",
  path: "/services",
});

export default function ServicesPage() {
  const { header, intro, control, equipment, cta } = servicesPage;

  return (
    <>
      <PageHeader
        photo="night"
        eyebrow={header.eyebrow}
        title={header.title}
        description={header.description}
        breadcrumbs={[{ label: "Services", href: "/services" }]}
      />

      <section aria-labelledby="services-list-title" className="section-y">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-12">
            <Reveal className="lg:col-span-7">
              <SectionHeading
                id="services-list-title"
                eyebrow={intro.eyebrow}
                title={intro.title}
                description={intro.description}
              />
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-5">
              <aside
                aria-labelledby="control-title"
                className="bg-ember rounded-panel border border-white/10 p-7 sm:p-8"
              >
                <p className="text-sm font-semibold text-orange">{control.eyebrow}</p>
                <h2 id="control-title" className="mt-3 text-2xl font-semibold tracking-tight">
                  {control.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-subtle-foreground">
                  {control.description}
                </p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {control.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-white"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </aside>
            </Reveal>
          </div>

          <ol className="mt-16 space-y-5 lg:mt-20">
            {dispatchServices.map((service, index) => (
              <li key={service.id} id={service.id} className="scroll-mt-28">
                <Reveal delay={Math.min(index * 0.04, 0.2)}>
                  <article
                    aria-labelledby={`${service.id}-title`}
                    className="group grid gap-6 rounded-panel card-surface p-6 transition-colors duration-300 hover:border-card-border-hover sm:p-8 lg:grid-cols-12 lg:gap-10"
                  >
                    <div className="lg:col-span-1">
                      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-orange/15 text-orange transition-colors duration-300 group-hover:bg-orange group-hover:text-ink">
                        <DispatchServiceIcon name={service.icon} className="size-6" />
                      </span>
                    </div>
                    <div className="lg:col-span-6">
                      <h3
                        id={`${service.id}-title`}
                        className="text-2xl font-medium tracking-[-0.03em] sm:text-3xl"
                      >
                        {service.title}
                      </h3>
                      <p className="mt-3 max-w-xl leading-relaxed text-subtle-foreground">
                        {service.description}
                      </p>
                    </div>
                    <ul className="space-y-3 text-sm text-gray lg:col-span-5 lg:pt-2">
                      {service.tasks.map((task) => (
                        <li key={task} className="flex items-start gap-3">
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-orange"
                            aria-hidden="true"
                          />
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Equipment link band */}
      <section aria-labelledby="services-equipment-title" className="section-b">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-banner bg-orange p-8 text-ink sm:p-12">
              <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-7">
                  <h2
                    id="services-equipment-title"
                    className="text-3xl font-medium tracking-[-0.035em] text-balance sm:text-4xl"
                  >
                    {equipment.title}
                  </h2>
                  <p className="mt-3 max-w-xl leading-relaxed text-ink/80">
                    {equipment.description}
                  </p>
                  <Link
                    href="/equipment"
                    className="group mt-7 inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brown"
                  >
                    {equipment.linkLabel}
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                    />
                  </Link>
                </div>
                <ul className="flex flex-wrap gap-2 lg:col-span-5 lg:justify-end">
                  {equipmentServices.map((service) => (
                    <li key={service.slug}>
                      <Link
                        href={`/services/${service.slug}`}
                        className="inline-flex rounded-full border border-ink/25 px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-ink hover:text-white"
                      >
                        {service.name.replace(/ Dispatch$/, "")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <CtaSection
        headingId="services-cta-title"
        spacing="bottom"
        title={cta.title}
        description={cta.description}
        image={{ src: "/images/hero/truck-night-trails.jpg", objectPosition: "70% 50%" }}
      />
    </>
  );
}
