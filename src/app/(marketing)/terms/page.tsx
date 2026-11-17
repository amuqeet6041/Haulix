import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms & Conditions",
  description: "Terms and conditions for using the HAULIX website.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <PageHeader
        title="Terms & Conditions"
        breadcrumbs={[{ label: "Terms & Conditions", href: "/terms" }]}
      />
      <section className="py-16 sm:py-20">
        <Container narrow>
          <p>
            The HAULIX terms and conditions will be published here. The legal text must be written
            or reviewed by a qualified professional before launch.
          </p>
        </Container>
      </section>
    </>
  );
}
