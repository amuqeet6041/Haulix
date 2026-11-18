import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackToLeads, LeadDetailView } from "@/components/admin/lead-detail-view";
import { ErrorNotice } from "@/components/admin/error-notice";
import { requireAdminPage } from "@/lib/admin-page";
import { getLead } from "@/services/admin-lead.service";
import { leadIdSchema } from "@/validations/admin-leads";

// A fixed title: lead details (names, emails) never go into the page title.
export const metadata: Metadata = { title: "Lead details" };

const ERROR_TEXT = {
  not_configured: "The lead database is not connected, so this lead cannot be shown yet.",
  failed: "We could not load this lead. Please refresh the page to try again.",
} as const;

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * /admin/leads/[id]. Read-only detail for one lead, with its notes and
 * activity. Uses the same service as GET /api/admin/leads/[id] (`lead:read`
 * permission, explicit safe fields). A malformed id and an id that does not
 * exist both give the same 404, so ids cannot be probed.
 */
export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const admin = await requireAdminPage();

  const parsed = leadIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();

  const result = await getLead(admin, parsed.data);
  if (!result.ok) {
    if (result.reason === "not_found") notFound();
    return (
      <section aria-labelledby="lead-error-title">
        <BackToLeads />
        <h1 id="lead-error-title" className="mt-4 text-3xl font-semibold tracking-tight">
          Lead
        </h1>
        <ErrorNotice title="Lead unavailable" className="mt-8">
          {ERROR_TEXT[result.reason]}
        </ErrorNotice>
      </section>
    );
  }

  return <LeadDetailView lead={result.data} />;
}
