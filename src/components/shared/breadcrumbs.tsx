import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

import { JsonLd } from "@/components/shared/json-ld";
import { cn } from "@/lib/utils";
import { breadcrumbJsonLd } from "@/lib/seo";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onDark?: boolean;
}

/** Accessible breadcrumb trail. The last item is the current page. Includes JSON-LD. */
export function Breadcrumbs({ items, onDark = false }: BreadcrumbsProps) {
  const trail = [{ label: "Home", href: "/" }, ...items];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(trail.map((item) => ({ name: item.label, path: item.href })))}
      />
      <nav aria-label="Breadcrumb">
        <ol
          className={cn(
            "flex flex-wrap items-center gap-1.5 text-sm",
            onDark ? "text-on-dark-muted" : "text-muted-foreground",
          )}
        >
          {trail.map((item, index) => {
            const isLast = index === trail.length - 1;
            return (
              <Fragment key={item.href}>
                <li>
                  {isLast ? (
                    <span aria-current="page" className={onDark ? "text-white" : "text-foreground"}>
                      {item.label}
                    </span>
                  ) : (
                    <Link href={item.href} className="transition-colors hover:text-brand-500">
                      {item.label}
                    </Link>
                  )}
                </li>
                {isLast ? null : (
                  <li aria-hidden="true">
                    <ChevronRight className="size-3.5" />
                  </li>
                )}
              </Fragment>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
