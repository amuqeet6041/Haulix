"use client";

import { BackToLeads } from "@/components/admin/lead-detail-view";
import { ErrorNotice } from "@/components/admin/error-notice";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for a lead page. The message is generic on purpose: the error
 * object (which could mention queries or data) is never shown. Next 16 passes
 * `retry` (re-fetches); older builds pass `reset`.
 */
export default function LeadDetailError({
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  const tryAgain = retry ?? reset;
  return (
    <section aria-labelledby="lead-error-title">
      <BackToLeads />
      <h1 id="lead-error-title" className="mt-4 text-3xl font-semibold tracking-tight">
        Lead
      </h1>
      <ErrorNotice
        title="Something went wrong"
        className="mt-8"
        action={
          tryAgain ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => tryAgain()}>
              Try again
            </Button>
          ) : undefined
        }
      >
        We could not show this lead. You can try again, or go back to the list.
      </ErrorNotice>
    </section>
  );
}
