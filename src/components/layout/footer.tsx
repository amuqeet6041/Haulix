import Link from "next/link";

import { Container } from "@/components/shared/container";
import { ContactDetails } from "@/components/shared/contact-details";
import { Logo } from "@/components/shared/logo";
import { footerNav, type NavLink } from "@/config/navigation";
import { siteConfig } from "@/config/site";

function FooterColumn({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <h2 className="font-display text-base font-semibold text-white">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="transition-colors hover:text-orange">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const { contact, social } = siteConfig;
  const socialLinks = social.filter((item) => item.href.length > 0);
  const hasContact = Boolean(contact.email || contact.phone || contact.address);

  return (
    <footer className="relative overflow-hidden bg-ink-warm pt-20 pb-10 text-subtle-foreground">
      <Container>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr]">
          <div className="lg:col-span-1">
            <Logo size="lg" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">{siteConfig.tagline}.</p>
            {socialLinks.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-4 text-sm">
                {socialLinks.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-orange"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <FooterColumn title="Company" links={footerNav.company} />
          <FooterColumn title="Services" links={footerNav.services} />
          <FooterColumn title="Equipment" links={footerNav.equipment} />
          <div>
            <h2 className="font-display text-base font-semibold text-white">Contact</h2>
            <div className="mt-4">
              {hasContact ? (
                <ContactDetails variant="list" />
              ) : (
                <p className="text-sm">
                  Use our{" "}
                  <Link href="/contact" className="underline underline-offset-4 hover:text-orange">
                    contact form
                  </Link>{" "}
                  to reach the team.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.legalName}. All rights reserved.
          </p>
          <ul className="flex gap-5">
            {footerNav.legal.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-orange">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
