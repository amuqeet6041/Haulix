import { ActionButton, type ActionButtonProps } from "@/components/shared/action-button";

export type { ActionButtonProps };

/** Main call-to-action button. Pass `href` to render a link. */
export function PrimaryButton(props: ActionButtonProps) {
  return <ActionButton variant="primary" {...props} />;
}
