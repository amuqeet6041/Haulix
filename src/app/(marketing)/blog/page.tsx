import { Newspaper } from "lucide-react";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SecondaryButton } from "@/components/shared/secondary-button";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Blog",
  description: "News and articles for the trucking community from HAULIX.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <>
      <PageHeader
        eyebrow="Blog"
        title="The HAULIX blog"
        description="News and articles for the trucking community."
        breadcrumbs={[{ label: "Blog", href: "/blog" }]}
      />
      <section className="py-16 sm:py-20">
        <Container narrow>
          <EmptyState
            icon={Newspaper}
            title="No articles yet"
            description="Our first posts are on the way. Check back soon."
            action={<SecondaryButton href="/">Back to home</SecondaryButton>}
          />
        </Container>
      </section>
    </>
  );
}
