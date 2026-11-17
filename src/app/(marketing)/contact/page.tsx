import { Check, Mail, MapPin, Phone } from "lucide-react";

import { ContactForm } from "@/components/forms/contact-form";
import { ArrowLink } from "@/components/shared/arrow-link";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { siteConfig } from "@/config/site";
import { contactPage } from "@/content/contact";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact Us",
  description:
    "Questions about truck dispatching, equipment or working with HAULIX Logistics? Send our team a message.",
  path: "/contact",
});

export default function ContactPage() {
  const { header, form, paths, tips, detailsTitle } = contactPage;
  const { email, phone, address } = siteConfig.contact;
  // Only real, configured contact details are shown (none are set yet).
  const details = [
    email ? { icon: Mail, label: email, href: `mailto:${email}` } : null,
    phone ? { icon: Phone, label: phone, href: `tel:${phone}` } : null,
    address ? { icon: MapPin, label: address, href: undefined } : null,
  ].filter((item) => item !== null);

  return (
    <>
      <PageHeader
        eyebrow={header.eyebrow}
        title={header.title}
        description={header.description}
        breadcrumbs={[{ label: "Contact", href: "/contact" }]}
      />

      <section aria-labelledby="contact-form-title" className="section-y">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
            <div className="order-last space-y-5 lg:order-first lg:col-span-5">
              {details.length > 0 ? (
                <div className="rounded-panel card-surface p-7">
                  <h2 className="label-caps text-orange">{detailsTitle}</h2>
                  <ul className="mt-4 space-y-3">
                    {details.map(({ icon: Icon, label, href }) => (
                      <li key={label} className="flex items-center gap-3 text-gray">
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
                </div>
              ) : null}

              {paths.map((path) => (
                <div key={path.title} className="rounded-panel card-surface p-7">
                  <h2 className="text-xl font-semibold tracking-tight">{path.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-subtle-foreground">
                    {path.description}
                  </p>
                  <ArrowLink href={path.link.href} tone="accent" className="mt-5">
                    {path.link.label}
                  </ArrowLink>
                </div>
              ))}

              <div className="bg-ember rounded-panel border border-white/10 p-7">
                <h2 className="label-caps text-orange">{tips.title}</h2>
                <ul className="mt-4 space-y-2.5 text-sm text-gray">
                  {tips.items.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <Check className="size-4 shrink-0 text-orange" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative rounded-panel card-surface p-6 shadow-lift sm:p-10">
                <h2
                  id="contact-form-title"
                  className="text-2xl font-medium tracking-[-0.03em] sm:text-3xl"
                >
                  {form.title}
                </h2>
                <p className="mt-2 mb-8 text-sm text-subtle-foreground">{form.description}</p>
                <ContactForm />
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
