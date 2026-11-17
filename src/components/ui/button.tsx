import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Button recipe. All sizes and variants live here so every call-to-action on
 * the site shares the same dimensions, hover, focus and disabled states.
 *
 * - primary: solid orange with dark text (white on #E86416 fails WCAG AA).
 * - secondary: translucent glass button for dark surfaces.
 * - outline: hairline cream outline that fills orange on hover (navbar CTA).
 * - ghost / link: low-emphasis actions.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-glow hover:-translate-y-px hover:bg-orange-soft",
        secondary:
          "border border-white/20 bg-white/5 text-white backdrop-blur-sm hover:border-orange hover:bg-white/10",
        outline:
          "border border-cream/40 bg-transparent text-white hover:border-orange hover:bg-orange hover:text-ink",
        /** @deprecated Same as `secondary`; kept so existing call sites keep working. */
        onDark:
          "border border-white/20 bg-white/5 text-white backdrop-blur-sm hover:border-orange hover:bg-white/10",
        ghost: "text-foreground hover:bg-surface",
        link: "text-orange underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3.5",
        md: "h-11 px-5",
        lg: "h-12 px-7 text-base",
        /** Large marketing CTA used in heroes and banners. */
        xl: "h-12 rounded-md px-9 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render the child element (e.g. a Next.js Link) with button styles. */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
