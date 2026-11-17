import { ContactForm } from "@/components/forms/contact-form";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact",
  description: "Get in touch with the HAULIX team.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Contact HAULIX"
        description="Send us a message and we will get back to you."
        breadcrumbs={[{ label: "Contact", href: "/contact" }]}
      />
      <section className="relative py-16 sm:py-20">
        <Container narrow>
          <ContactForm />
        </Container>
      </section>
    </>
  );
}
