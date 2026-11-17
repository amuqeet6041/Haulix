import { BookOpen } from "lucide-react";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SecondaryButton } from "@/components/shared/secondary-button";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Resources",
  description: "Guides and tools for owner-operators and small fleets.",
  path: "/resources",
});

export default function ResourcesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Resources for carriers"
        description="Guides and tools for owner-operators and small fleets."
        breadcrumbs={[{ label: "Resources", href: "/resources" }]}
      />
      <section className="py-16 sm:py-20">
        <Container narrow>
          <EmptyState
            icon={BookOpen}
            title="Resources are coming soon"
            description="We are preparing helpful guides for carriers. In the meantime, our FAQ covers the basics."
            action={<SecondaryButton href="/faq">Read the FAQ</SecondaryButton>}
          />
        </Container>
      </section>
    </>
  );
}
