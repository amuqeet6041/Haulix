import { ActionButton, type ActionButtonProps } from "@/components/shared/action-button";

interface SecondaryButtonProps extends ActionButtonProps {
  /** Kept for API compatibility: the site is dark-first, so this no longer changes styles. */
  onDark?: boolean;
}

/** Secondary action button (translucent, for dark surfaces). Pass `href` to render a link. */
export function SecondaryButton({ onDark, ...props }: SecondaryButtonProps) {
  void onDark; // accepted but unused; never forwarded to the DOM
  return <ActionButton variant="secondary" {...props} />;
}
