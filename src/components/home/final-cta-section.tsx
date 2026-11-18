import { ContactDetails } from "@/components/shared/contact-details";
import { CtaSection } from "@/components/shared/cta-section";
import { landingSectionIds } from "@/config/navigation";
import { finalCta } from "@/content/landing";

/**
 * Closing conversion band. Doubles as the "Contact" anchor: it shows the public
 * phone and email (from `siteConfig.contact`) as tappable links, and always
 * points to the contact form too.
 */
export function FinalCtaSection() {
  return (
    <CtaSection
      id={landingSectionIds.contact}
      spacing="bottom"
      eyebrow={finalCta.eyebrow}
      title={finalCta.title}
      description={finalCta.description}
      primary={finalCta.primaryCta}
      secondary={finalCta.secondaryCta}
      image={{ src: "/images/hero/truck-night-trails.jpg", objectPosition: "75% 50%" }}
    >
      <p className="mb-4 text-gray/85">Prefer to talk it through? Call or write to us directly.</p>
      <ContactDetails variant="pills" />
    </CtaSection>
  );
}
