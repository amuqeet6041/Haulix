import { AboutSection } from "@/components/home/about-section";
import { AdvantagesSection } from "@/components/home/advantages-section";
import { EquipmentSection } from "@/components/home/equipment-section";
import { FaqSection } from "@/components/home/faq-section";
import { FinalCtaSection } from "@/components/home/final-cta-section";
import { HeroSection } from "@/components/home/hero-section";
import { ProcessSection } from "@/components/home/process-section";
import { ServicesSection } from "@/components/home/services-section";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { TrustStrip } from "@/components/home/trust-strip";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: siteConfig.tagline,
  description: siteConfig.description,
  path: "/",
});

/** Phase 1 single-page landing. Section copy lives in `src/content/landing.ts`. */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustStrip />
      <AboutSection />
      <ServicesSection />
      <AdvantagesSection />
      <ProcessSection />
      <EquipmentSection />
      <TestimonialsSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
