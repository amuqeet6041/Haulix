import { Container } from "@/components/shared/container";
import { CtaSection } from "@/components/shared/cta-section";
import { FaqAccordion } from "@/components/shared/faq-accordion";
import { JsonLd } from "@/components/shared/json-ld";
import { PageHeader } from "@/components/shared/page-header";
import { faqs } from "@/content/faqs";
import { buildMetadata, faqJsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "FAQ",
  description: "Answers to common questions about truck dispatching with HAULIX.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqJsonLd(faqs)} />
      <PageHeader
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Quick answers about dispatching and working with HAULIX."
        breadcrumbs={[{ label: "FAQ", href: "/faq" }]}
      />
      <section className="py-16 sm:py-20">
        <Container narrow>
          <FaqAccordion items={faqs} />
        </Container>
      </section>
      <CtaSection />
    </>
  );
}
