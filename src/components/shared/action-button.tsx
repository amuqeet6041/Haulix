import Link from "next/link";

import { Button, type ButtonProps, type ButtonVariant } from "@/components/ui/button";

export interface ActionButtonProps extends Omit<ButtonProps, "asChild" | "variant"> {
  /** When set, renders a Next.js Link styled as a button. */
  href?: string;
}

interface VariantActionButtonProps extends ActionButtonProps {
  variant: ButtonVariant;
}

/**
 * Renders a `Button`, or a Next.js `Link` styled as one when `href` is given.
 * Prefer the named wrappers (`PrimaryButton`, `SecondaryButton`, `OutlineButton`).
 */
export function ActionButton({ href, variant, children, ...props }: VariantActionButtonProps) {
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

/** Outlined action that fills orange on hover. Pass `href` to render a link. */
export function OutlineButton(props: ActionButtonProps) {
  return <ActionButton variant="outline" {...props} />;
}
