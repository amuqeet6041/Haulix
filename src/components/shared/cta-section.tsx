import { Container } from "@/components/shared/container";
import { PrimaryButton } from "@/components/shared/primary-button";
import { SecondaryButton } from "@/components/shared/secondary-button";

interface CtaSectionProps {
  title?: string;
  description?: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
}

/** Closing call-to-action band shown near the bottom of marketing pages. */
export function CtaSection({
  title = "Ready to talk about dispatching?",
  description = "Tell us about your truck and the freight you run. Our team will follow up with you.",
  primary = { label: "Get Started", href: "/get-started" },
  secondary = { label: "Contact Us", href: "/contact" },
}: CtaSectionProps) {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="bg-hero-gradient rounded-3xl px-6 py-14 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl text-3xl text-white sm:text-4xl">{title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-on-dark-muted">{description}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryButton href={primary.href} size="lg">
              {primary.label}
            </PrimaryButton>
            <SecondaryButton href={secondary.href} size="lg" onDark>
              {secondary.label}
            </SecondaryButton>
          </div>
        </div>
      </Container>
    </section>
  );
}
