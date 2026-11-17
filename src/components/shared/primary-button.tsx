import Link from "next/link";
import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

export interface ActionButtonProps extends Omit<ButtonProps, "asChild" | "variant"> {
  /** When set, renders a Next.js Link styled as a button. */
  href?: string;
}

/** Main call-to-action button. Pass `href` to render a link. */
export function PrimaryButton({ href, children, ...props }: ActionButtonProps) {
  if (href) {
    return (
      <Button asChild variant="primary" {...props}>
        <Link href={href}>{children}</Link>
      </Button>
    );
  }
  return (
    <Button variant="primary" {...props}>
      {children}
    </Button>
  );
}
