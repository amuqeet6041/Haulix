import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How HAULIX collects and uses information.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHeader
        title="Privacy Policy"
        breadcrumbs={[{ label: "Privacy Policy", href: "/privacy-policy" }]}
      />
      <section className="py-16 sm:py-20">
        <Container narrow>
          <p>
            The HAULIX privacy policy will be published here. The legal text must be written or
            reviewed by a qualified professional before launch.
          </p>
        </Container>
      </section>
    </>
  );
}
