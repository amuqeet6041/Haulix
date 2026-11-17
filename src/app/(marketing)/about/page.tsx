import { Container } from "@/components/shared/container";
import { CtaSection } from "@/components/shared/cta-section";
import { PageHeader } from "@/components/shared/page-header";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "About Us",
  description:
    "Learn about HAULIX, an American truck dispatching company supporting owner-operators and small fleets.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="About HAULIX"
        description="An American truck dispatching company built around owner-operators and small fleets."
        breadcrumbs={[{ label: "About", href: "/about" }]}
      />
      <section className="py-16 sm:py-20">
        <Container narrow>
          <p>
            HAULIX helps carriers find freight and keep their trucks moving. Our full company story,
            team and values will be added here.
          </p>
          <p className="mt-4 text-sm text-subtle-foreground">
            Content placeholder: replace this page with the approved HAULIX company copy.
          </p>
        </Container>
      </section>
      <CtaSection />
    </>
  );
}
