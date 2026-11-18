import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";

import { LocalTime } from "@/components/admin/local-time";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { leadStatusLabel, leadStatusTone, leadTypeLabel } from "@/content/lead-status";
import { getEquipmentService } from "@/content/services";
import {
  buildLeadsHref,
  leadDetailHref,
  sortedState,
  type LeadListState,
} from "@/lib/admin-lead-url";
import { cn } from "@/lib/utils";
import type { AdminLeadSummary } from "@/types/admin";
import type { LeadSortField } from "@/validations/admin-leads";

/** Human label for an equipment slug; falls back to the stored text. */
export function equipmentLabel(slug: string | null): string | null {
  if (!slug) return null;
  return getEquipmentService(slug)?.name ?? slug;
}

const th = "px-4 py-3 text-left align-bottom label-caps font-semibold text-gray whitespace-nowrap";

function SortableHeader({
  column,
  label,
  state,
  className,
}: {
  column: LeadSortField;
  label: string;
  state: LeadListState;
  className?: string;
}) {
  const active = state.sort === column;
  const ariaSort = active ? (state.dir === "asc" ? "ascending" : "descending") : "none";
  const Icon = active ? (state.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th scope="col" aria-sort={ariaSort} className={cn(th, className)}>
      <Link
        href={buildLeadsHref(sortedState(state, column))}
        className="inline-flex items-center gap-1.5 rounded text-inherit hover:text-foreground"
      >
        {label}
        <Icon
          className={cn("size-3.5", active ? "text-orange" : "text-gray/60")}
          aria-hidden="true"
        />
        <span className="sr-only">
          {active
            ? `, sorted ${state.dir === "asc" ? "ascending" : "descending"}. Activate to reverse.`
            : ", activate to sort"}
        </span>
      </Link>
    </th>
  );
}

/**
 * The leads table. Semantic markup: a captioned table with column headers and
 * a row header per lead. Below `lg` the type, company and equipment columns
 * fold into the lead cell, and the table scrolls sideways inside its frame
 * rather than breaking the page.
 */
export function LeadsTable({
  leads,
  state,
  caption,
}: {
  leads: AdminLeadSummary[];
  state: LeadListState;
  caption: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl card-surface">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border">
          <tr>
            <SortableHeader column="fullName" label="Lead" state={state} />
            <SortableHeader
              column="type"
              label="Type"
              state={state}
              className="hidden lg:table-cell"
            />
            <th scope="col" className={cn(th, "hidden lg:table-cell")}>
              Company
            </th>
            <th scope="col" className={cn(th, "hidden xl:table-cell")}>
              Equipment
            </th>
            <SortableHeader column="status" label="Status" state={state} />
            <SortableHeader column="createdAt" label="Submitted" state={state} />
            <th scope="col" className={cn(th, "text-right")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {leads.map((lead) => {
            const equipment = equipmentLabel(lead.equipment);
            const detail = [
              leadTypeLabel(lead.type, { short: true }),
              lead.companyName,
              equipment,
            ].filter(Boolean);
            return (
              <tr key={lead.id} className="align-top transition-colors hover:bg-cream/5">
                <th scope="row" className="min-w-60 px-4 py-4 text-left font-normal">
                  <span className="block font-semibold text-foreground">{lead.fullName}</span>
                  <span className="mt-0.5 block [overflow-wrap:anywhere] text-gray">
                    {lead.email}
                  </span>
                  {lead.phone ? <span className="block text-gray">{lead.phone}</span> : null}
                  <span className="mt-1 block text-xs text-gray lg:hidden">
                    {detail.join(" · ")}
                  </span>
                </th>
                <td className="hidden px-4 py-4 whitespace-nowrap text-gray lg:table-cell">
                  {leadTypeLabel(lead.type)}
                </td>
                <td className="hidden px-4 py-4 text-gray lg:table-cell">
                  {lead.companyName ?? <span aria-label="Not provided">&mdash;</span>}
                </td>
                <td className="hidden px-4 py-4 text-gray xl:table-cell">
                  {equipment ?? <span aria-label="Not provided">&mdash;</span>}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <Badge tone={leadStatusTone(lead.status)} dot>
                    {leadStatusLabel(lead.status)}
                  </Badge>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-gray">
                  <LocalTime iso={lead.createdAt} />
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={leadDetailHref(lead.id)}
                    aria-label={`View details for ${lead.fullName}`}
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LeadsTableSkeleton() {
  return (
    <SkeletonGroup label="Loading leads" className="space-y-6">
      <Skeleton className="h-36 rounded-2xl" />
      <div className="overflow-hidden rounded-2xl card-surface">
        <div className="border-b border-border p-4">
          <Skeleton className="h-4 w-1/2" />
        </div>
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-border p-4 last:border-0"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="hidden h-4 w-32 sm:block" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}
