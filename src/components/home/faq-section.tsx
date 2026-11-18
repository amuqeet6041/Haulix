import { ArrowLink } from "@/components/shared/arrow-link";
import { Container } from "@/components/shared/container";
import { FaqAccordion } from "@/components/shared/faq-accordion";
import { JsonLd } from "@/components/shared/json-ld";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { landingSectionIds } from "@/config/navigation";
import { faqs } from "@/content/faqs";
import { faqSection } from "@/content/landing";
import { faqJsonLd } from "@/lib/seo";

export function FaqSection() {
  return (
    <section id={landingSectionIds.faq} aria-labelledby="faq-title" className="section-y">
      <JsonLd data={faqJsonLd(faqs)} />
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          <Reveal className="lg:col-span-5">
            <SectionHeading
              id="faq-title"
              eyebrow={faqSection.eyebrow}
              title={faqSection.title}
              description={faqSection.description}
            />
            <ArrowLink href="/contact" className="mt-8">
              Still have questions? Contact us
            </ArrowLink>
          </Reveal>
          <Reveal delay={0.05} className="lg:col-span-7">
            <FaqAccordion items={faqs} />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
