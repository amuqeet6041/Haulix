import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";

import type { ActionButtonProps } from "./primary-button";

interface SecondaryButtonProps extends ActionButtonProps {
  /** Use on dark backgrounds. */
  onDark?: boolean;
}

/** Secondary action button (outlined). Pass `href` to render a link. */
export function SecondaryButton({
  href,
  onDark = false,
  children,
  ...props
}: SecondaryButtonProps) {
  const variant = onDark ? "onDark" : "secondary";

  if (href) {
    return (
      <Button asChild variant={variant} {...props}>
        <Link href={href}>{children}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} {...props}>
      {children}
    </Button>
  );
}
