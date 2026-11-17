import { Breadcrumbs, type BreadcrumbItem } from "@/components/shared/breadcrumbs";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs: BreadcrumbItem[];
}

/** Dark intro band used at the top of every inner page. Renders the page's single h1. */
export function PageHeader({ title, description, eyebrow, breadcrumbs }: PageHeaderProps) {
  return (
    <header className="bg-hero-gradient py-14 sm:py-20">
      <Container>
        <div className="mb-8">
          <Breadcrumbs items={breadcrumbs} onDark />
        </div>
        <SectionHeading as="h1" onDark eyebrow={eyebrow} title={title} description={description} />
      </Container>
    </header>
  );
}
