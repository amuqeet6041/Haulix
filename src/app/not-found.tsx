import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Container } from "@/components/shared/container";
import { PrimaryButton } from "@/components/shared/primary-button";
import { SecondaryButton } from "@/components/shared/secondary-button";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Page not found",
  description: "The page you are looking for does not exist.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="py-28">
        <Container narrow>
          <p className="text-sm font-semibold tracking-widest text-brand-600 uppercase">404</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Page not found</h1>
          <p className="mt-4">The page you are looking for does not exist or has moved.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryButton href="/">Back to home</PrimaryButton>
            <SecondaryButton href="/contact">Contact us</SecondaryButton>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
