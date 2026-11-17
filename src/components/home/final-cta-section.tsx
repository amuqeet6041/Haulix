import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { CtaSection } from "@/components/shared/cta-section";
import { landingSectionIds } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { finalCta } from "@/content/landing";

/**
 * Closing conversion band. Doubles as the "Contact" anchor: it lists the public
 * contact details from `siteConfig.contact` (only those that are set) and
 * otherwise points to the contact form.
 */
export function FinalCtaSection() {
  const { email, phone, address } = siteConfig.contact;
  const details = [
    email ? { icon: Mail, label: email, href: `mailto:${email}` } : null,
    phone ? { icon: Phone, label: phone, href: `tel:${phone}` } : null,
    address ? { icon: MapPin, label: address, href: undefined } : null,
  ].filter((item) => item !== null);

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
      {details.length > 0 ? (
        <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-8">
          {details.map(({ icon: Icon, label, href }) => (
            <li key={label} className="flex items-center gap-2.5 text-gray">
              <Icon className="size-4 text-orange" aria-hidden="true" />
              {href ? (
                <a href={href} className="transition-colors hover:text-orange">
                  {label}
                </a>
              ) : (
                label
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray/85">
          Prefer to write first? Send us a message through the{" "}
          <Link
            href="/contact"
            className="font-semibold text-white underline underline-offset-4 hover:text-orange"
          >
            contact form
          </Link>
          .
        </p>
      )}
    </CtaSection>
  );
}
