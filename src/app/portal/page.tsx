import { Container } from "@/components/shared/container";
import { PrimaryButton } from "@/components/shared/primary-button";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Carrier Portal",
  description: "The HAULIX Carrier Portal is coming soon.",
  path: "/portal",
  noIndex: true,
});

/**
 * Placeholder for the future Carrier Portal (Module 2). See ./README.md.
 * Replace this file with the portal entry point when Module 2 starts.
 */
export default function PortalPlaceholderPage() {
  return (
    <main id="main-content" className="py-28">
      <Container narrow>
        <p className="text-sm font-semibold tracking-widest text-brand-600 uppercase">
          Coming soon
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl">HAULIX Carrier Portal</h1>
        <p className="mt-4">The carrier portal is not available yet.</p>
        <div className="mt-8">
          <PrimaryButton href="/">Back to home</PrimaryButton>
        </div>
      </Container>
    </main>
  );
}
