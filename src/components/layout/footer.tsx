import Link from "next/link";

import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";
import { footerNav, type NavLink } from "@/config/navigation";
import { siteConfig } from "@/config/site";

function FooterColumn({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold tracking-widest text-white uppercase">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="transition-colors hover:text-white">
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
    <footer className="bg-navy-950 pt-16 pb-8 text-on-dark-muted">
      <Container>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">{siteConfig.tagline}.</p>
            {socialLinks.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-4 text-sm">
                {socialLinks.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-white"
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
            <h2 className="text-sm font-semibold tracking-widest text-white uppercase">Contact</h2>
            <div className="mt-4 space-y-2.5 text-sm">
              {hasContact ? (
                <>
                  {contact.email ? (
                    <p>
                      <a href={`mailto:${contact.email}`} className="hover:text-white">
                        {contact.email}
                      </a>
                    </p>
                  ) : null}
                  {contact.phone ? (
                    <p>
                      <a href={`tel:${contact.phone}`} className="hover:text-white">
                        {contact.phone}
                      </a>
                    </p>
                  ) : null}
                  {contact.address ? <p>{contact.address}</p> : null}
                </>
              ) : (
                <p>
                  Use our{" "}
                  <Link href="/contact" className="underline underline-offset-4 hover:text-white">
                    contact form
                  </Link>{" "}
                  to reach the team.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.legalName}. All rights reserved.
          </p>
          <ul className="flex gap-5">
            {footerNav.legal.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-white">
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
