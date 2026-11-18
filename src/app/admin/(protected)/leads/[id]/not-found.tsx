import { BackToLeads } from "@/components/admin/lead-detail-view";
import { EmptyState } from "@/components/shared/empty-state";

/** Shown for an unknown or malformed lead id (the page also answers 404). */
export default function LeadNotFound() {
  return (
    <section aria-labelledby="lead-not-found-title">
      <BackToLeads />
      <h1 id="lead-not-found-title" className="mt-4 text-3xl font-semibold tracking-tight">
        Lead not found
      </h1>
      <EmptyState
        className="mt-8"
        title="We could not find that lead"
        description="It may have been removed, or the link may be wrong. Go back to the list to find it."
      />
    </section>
  );
}
