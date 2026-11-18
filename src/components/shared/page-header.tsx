import Image from "next/image";

import { Breadcrumbs, type BreadcrumbItem } from "@/components/shared/breadcrumbs";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";

/** The two project photos, with the crop that works best behind a page title. */
const photos = {
  night: { src: "/images/hero/truck-night-trails.jpg", position: "70% 50%" },
  sunset: { src: "/images/general/truck-sunset-highway.jpg", position: "45% 50%" },
} as const;

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs: BreadcrumbItem[];
  /** Optional photo shown on the right of the header on large screens (decorative). */
  photo?: keyof typeof photos;
}

/** Dark intro band used at the top of every inner page. Renders the page's single h1. */
export function PageHeader({ title, description, eyebrow, breadcrumbs, photo }: PageHeaderProps) {
  const image = photo ? photos[photo] : null;

  return (
    <header className="bg-hero-gradient relative isolate overflow-hidden py-14 sm:py-20">
      {image ? (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 -z-10 hidden w-[46%] lg:block"
        >
          <Image
            src={image.src}
            alt=""
            fill
            sizes="46vw"
            className="object-cover"
            style={{ objectPosition: image.position }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-warm via-ink-warm/70 to-transparent" />
        </div>
      ) : null}
      <Container>
        <div className="mb-8">
          <Breadcrumbs items={breadcrumbs} onDark />
        </div>
        <SectionHeading as="h1" onDark eyebrow={eyebrow} title={title} description={description} />
      </Container>
    </header>
  );
}
