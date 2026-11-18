"use client";

import { ErrorNotice } from "@/components/admin/error-notice";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for /admin/leads. The message is generic on purpose: the
 * error object (which could mention queries or data) is never shown. Next 16
 * passes `retry` (re-fetches); older builds pass `reset`.
 */
export default function LeadsError({
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  const tryAgain = retry ?? reset;
  return (
    <section aria-labelledby="leads-error-title">
      <p className="label-caps text-orange">Leads</p>
      <h1 id="leads-error-title" className="mt-2 text-3xl font-semibold tracking-tight">
        Leads
      </h1>
      <div className="mt-8">
        <ErrorNotice
          title="Something went wrong"
          action={
            tryAgain ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => tryAgain()}>
                Try again
              </Button>
            ) : undefined
          }
        >
          We could not show the leads. You can try again, or go back to the dashboard.
        </ErrorNotice>
      </div>
    </section>
  );
}
