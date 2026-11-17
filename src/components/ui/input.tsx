import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Shared field recipe for Input, Textarea and Select: translucent dark fill,
 * hairline border, orange focus ring, red border when `aria-invalid`.
 * Height matches the `md` button (h-11) so fields and buttons line up.
 */
export const fieldClasses =
  "w-full rounded-lg border border-input-border bg-input px-3.5 text-sm text-foreground shadow-sm transition-colors duration-200 placeholder:text-subtle-foreground hover:border-cream/25 focus-visible:border-orange focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(fieldClasses, "h-11", className)} {...props} />
  ),
);
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClasses, "min-h-28 py-2.5", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(fieldClasses, "h-11 [&>option]:bg-ink [&>option]:text-foreground", className)}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
