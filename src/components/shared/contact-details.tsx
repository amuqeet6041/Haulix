import { Mail, MapPin, Phone, type LucideIcon } from "lucide-react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface Detail {
  key: string;
  icon: LucideIcon;
  /** Short word shown above the value in the "cards" layout. */
  name: string;
  label: string;
  href?: string;
}

/** The public contact details that are set, in display order. Phone and email are always links. */
export function contactDetails(): Detail[] {
  const { email, phone, phoneHref, address } = siteConfig.contact;
  const details: Detail[] = [];
  if (phone)
    details.push({ key: "phone", icon: Phone, name: "Phone", label: phone, href: phoneHref });
  if (email) {
    details.push({
      key: "email",
      icon: Mail,
      name: "Email",
      label: email,
      href: `mailto:${email}`,
    });
  }
  if (address) details.push({ key: "address", icon: MapPin, name: "Address", label: address });
  return details;
}

type Variant = "list" | "cards" | "pills";

/**
 * HAULIX phone and email, rendered from `siteConfig.contact` so every page
 * shows the same, correct details. Renders nothing if none are set.
 *
 *  - "list":  compact rows for the footer
 *  - "cards": large tap targets for the contact page
 *  - "pills": rounded links for call-to-action bands
 */
export function ContactDetails({
  variant = "list",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const details = contactDetails();
  if (details.length === 0) return null;

  if (variant === "cards") {
    return (
      <ul className={cn("grid gap-3", className)}>
        {details.map(({ key, icon: Icon, name, label, href }) => {
          const body = (
            <>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange/15 text-orange">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-subtle-foreground">{name}</span>
                <span className="block font-display text-[0.95rem] font-semibold tracking-tight [overflow-wrap:anywhere] text-white sm:text-lg">
                  {label}
                </span>
              </span>
            </>
          );
          return (
            <li key={key}>
              {href ? (
                <a
                  href={href}
                  className="flex items-center gap-4 rounded-2xl card-surface p-4 transition-colors hover:border-card-border-hover hover:bg-brown/40 sm:p-5"
                >
                  {body}
                </a>
              ) : (
                <div className="flex items-center gap-4 rounded-2xl card-surface p-4 sm:p-5">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  if (variant === "pills") {
    return (
      <ul className={cn("flex flex-wrap gap-3", className)}>
        {details.map(({ key, icon: Icon, label, href }) => (
          <li key={key}>
            {href ? (
              <a
                href={href}
                className="inline-flex items-center gap-2.5 rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-orange hover:text-ink"
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </a>
            ) : (
              <span className="inline-flex items-center gap-2.5 rounded-full bg-white/10 px-5 py-3 text-sm text-white">
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn("space-y-3 text-sm", className)}>
      {details.map(({ key, icon: Icon, label, href }) => (
        <li key={key} className="flex items-start gap-3">
          <Icon className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />
          {href ? (
            <a href={href} className="[overflow-wrap:anywhere] transition-colors hover:text-orange">
              {label}
            </a>
          ) : (
            <span>{label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
