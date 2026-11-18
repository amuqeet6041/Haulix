import { ArrowRight, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { LocalTime } from "@/components/admin/local-time";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import {
  leadStatuses,
  leadStatusLabel,
  leadStatusTone,
  leadTypeLabel,
  leadTypeOptions,
} from "@/content/lead-status";
import { leadDetailHref, LEADS_PATH } from "@/lib/admin-lead-url";
import { cn } from "@/lib/utils";
import type { AdminLeadSummary, DashboardStats } from "@/types/admin";

/**
 * Dashboard sections. Server components: they render data the page already
 * loaded on the server, so the browser never fetches private lead data.
 */

export { leadDetailHref };

const numberFormat = new Intl.NumberFormat("en-US");

function StatCard({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: number;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        emphasis ? "border-orange/40 bg-orange/10" : "card-surface",
      )}
    >
      <dt className="label-caps text-gray">{label}</dt>
      <dd className="mt-3">
        <span className="block font-display text-3xl font-bold tracking-tight text-foreground tabular-nums">
          {numberFormat.format(value)}
        </span>
        {hint ? <span className="mt-1 block text-xs text-gray">{hint}</span> : null}
      </dd>
    </div>
  );
}

export function DashboardStatsView({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-10">
      <section aria-labelledby="status-heading">
        <h2 id="status-heading" className="text-lg font-semibold">
          Leads by status
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard
            label="Total leads"
            value={stats.totalLeads}
            hint="All statuses, including rejected and spam"
            emphasis
          />
          {leadStatuses.map((status) => (
            <StatCard
              key={status.value}
              label={status.label}
              value={stats.byStatus[status.value]}
            />
          ))}
        </dl>
      </section>

      <section aria-labelledby="type-heading">
        <h2 id="type-heading" className="text-lg font-semibold">
          Leads by type
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 lg:max-w-xl">
          {leadTypeOptions.map((type) => (
            <StatCard key={type.value} label={type.pluralLabel} value={stats.byType[type.value]} />
          ))}
        </dl>
      </section>

      <RecentLeads leads={stats.recentLeads} />
    </div>
  );
}

function RecentLeads({ leads }: { leads: AdminLeadSummary[] }) {
  return (
    <section aria-labelledby="recent-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="recent-heading" className="text-lg font-semibold">
          Recent leads
        </h2>
        {leads.length > 0 ? (
          <Link
            href={LEADS_PATH}
            className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-orange hover:underline"
          >
            View all leads
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {leads.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="No leads yet"
          description="New carrier inquiries and contact messages will appear here as soon as they are submitted."
        />
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl card-surface">
          {leads.map((lead) => (
            <li key={lead.id}>
              <Link
                href={leadDetailHref(lead.id)}
                className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-cream/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-foreground">
                    {lead.fullName}
                  </span>
                  <span className="block truncate text-sm text-gray">
                    {lead.companyName ?? lead.email}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="text-sm text-gray">
                    {leadTypeLabel(lead.type, { short: true })}
                  </span>
                  <Badge tone={leadStatusTone(lead.status)} dot>
                    {leadStatusLabel(lead.status)}
                  </Badge>
                  <LocalTime
                    iso={lead.createdAt}
                    className="text-sm text-gray sm:w-48 sm:text-right"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <SkeletonGroup label="Loading dashboard" className="space-y-10">
      <div>
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 space-y-px overflow-hidden rounded-2xl">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-none" />
          ))}
        </div>
      </div>
    </SkeletonGroup>
  );
}

const ERROR_TEXT = {
  not_configured: "The lead database is not connected, so there is nothing to show yet.",
  failed: "We could not load the dashboard. Please refresh the page to try again.",
} as const;

export type DashboardErrorReason = keyof typeof ERROR_TEXT;

export function DashboardError({ reason }: { reason: DashboardErrorReason }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5"
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
      <div>
        <p className="font-semibold text-foreground">Dashboard unavailable</p>
        <p className="mt-1 text-sm text-gray">{ERROR_TEXT[reason]}</p>
      </div>
    </div>
  );
}
