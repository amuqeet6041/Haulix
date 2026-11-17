import { LeadForm } from "@/components/forms/lead-form";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Get Started",
  description: "Submit a carrier inquiry and the HAULIX team will contact you.",
  path: "/get-started",
});

export default function GetStartedPage() {
  return (
    <>
      <PageHeader
        eyebrow="Get started"
        title="Tell us about your trucks"
        description="Fill in the form and our team will contact you to talk about dispatching."
        breadcrumbs={[{ label: "Get Started", href: "/get-started" }]}
      />
      <section className="relative py-16 sm:py-20">
        <Container narrow>
          <LeadForm />
        </Container>
      </section>
    </>
  );
}
