import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { equipmentLabel } from "@/components/admin/leads-table";
import { LocalTime } from "@/components/admin/local-time";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { inquiryTypeLabel, type InquiryTypeValue } from "@/content/inquiry-types";
import {
  leadStatusMeta,
  leadStatusLabel,
  leadStatusTone,
  leadTypeLabel,
} from "@/content/lead-status";
import { LEADS_PATH } from "@/lib/admin-lead-url";
import { buildLeadTimeline, UNKNOWN_ACTOR, type TimelineTone } from "@/lib/lead-timeline";
import { cn } from "@/lib/utils";
import type { AdminLeadDetail, AdminLeadNote } from "@/types/admin";

/**
 * Read-only lead detail. Server components that render one already-loaded
 * AdminLeadDetail (the safe, explicitly selected shape from the service), so
 * nothing private can appear here: a field is shown only if the type lists it.
 * There are no forms or buttons that change data; status changes and notes are
 * later steps.
 */

export function BackToLeads({ className }: { className?: string }) {
  return (
    <Link
      href={LEADS_PATH}
      className={cn(
        "inline-flex items-center gap-1.5 rounded text-sm font-semibold text-orange hover:underline",
        className,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to leads
    </Link>
  );
}

function Missing() {
  return (
    <span className="text-gray">
      <span aria-hidden="true">&mdash;</span>
      <span className="sr-only">Not provided</span>
    </span>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  /** Null, undefined or "" shows the "not provided" marker. */
  children: ReactNode;
  wide?: boolean;
}) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className={cn(wide && "sm:col-span-2")}>
      <dt className="label-caps text-gray">{label}</dt>
      <dd className="mt-1 [overflow-wrap:anywhere] text-foreground">
        {empty ? <Missing /> : children}
      </dd>
    </div>
  );
}

function Panel({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("rounded-2xl card-surface p-5 sm:p-6", className)}>
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const linkClass = "rounded text-orange underline-offset-4 hover:underline";

/** A phone number as a tel: link, using only digits and a leading plus. */
function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function NoteItem({ note }: { note: AdminLeadNote }) {
  const edited = note.updatedAt !== note.createdAt;
  return (
    <li className="rounded-xl border border-border bg-ink/40 p-4">
      <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-foreground">
        {note.body}
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-gray">
        <span>{note.author?.name.trim() || UNKNOWN_ACTOR}</span>
        <span aria-hidden="true">&middot;</span>
        <LocalTime iso={note.createdAt} />
        {edited ? (
          <>
            <span aria-hidden="true">&middot;</span>
            <span>
              edited <LocalTime iso={note.updatedAt} />
            </span>
          </>
        ) : null}
      </p>
    </li>
  );
}

const toneDot: Record<TimelineTone, string> = {
  default: "bg-cream/40",
  positive: "bg-orange",
  warning: "bg-destructive",
};

function Timeline({ lead }: { lead: AdminLeadDetail }) {
  const items = buildLeadTimeline(lead);
  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3">
          <span
            aria-hidden="true"
            className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", toneDot[item.tone])}
          />
          <div className="min-w-0">
            <p className="text-sm text-foreground">{item.title}</p>
            <p className="mt-0.5 text-xs text-gray">
              {item.actor ? <span>{item.actor}</span> : null}
              {item.actor && item.at ? <span aria-hidden="true"> &middot; </span> : null}
              {item.at ? <LocalTime iso={item.at} /> : null}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function LeadDetailView({ lead }: { lead: AdminLeadDetail }) {
  const isCarrier = lead.type === "CARRIER_INQUIRY";
  const isContact = lead.type === "CONTACT";
  const status = leadStatusMeta(lead.status);
  const equipment = equipmentLabel(lead.equipment);
  // A contact message may mention equipment or fleet size; show them only when given.
  const showEquipment = isCarrier || Boolean(equipment) || lead.fleetSize !== null;

  return (
    <article aria-labelledby="lead-title">
      <BackToLeads />

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-caps text-orange">{leadTypeLabel(lead.type)}</p>
          <h1
            id="lead-title"
            className="mt-2 text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]"
          >
            {lead.fullName}
          </h1>
          <p className="mt-2 text-sm text-gray">
            Submitted <LocalTime iso={lead.createdAt} />
          </p>
        </div>
        <Badge tone={leadStatusTone(lead.status)} dot className="px-3 py-1 text-sm">
          <span className="sr-only">Status: </span>
          {leadStatusLabel(lead.status)}
        </Badge>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel id="contact-heading" title="Contact">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Full name">{lead.fullName}</Field>
              <Field label="Email">
                <a href={`mailto:${lead.email}`} className={linkClass}>
                  {lead.email}
                </a>
              </Field>
              <Field label="Phone">
                {lead.phone ? (
                  <a href={phoneHref(lead.phone)} className={linkClass}>
                    {lead.phone}
                  </a>
                ) : null}
              </Field>
              <Field label="Company">{lead.companyName}</Field>
            </dl>
          </Panel>

          {isCarrier ? (
            <Panel id="carrier-heading" title="Carrier details">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="MC number">{lead.mcNumber}</Field>
                <Field label="DOT number">{lead.dotNumber}</Field>
              </dl>
            </Panel>
          ) : null}

          {showEquipment ? (
            <Panel id="equipment-heading" title="Equipment">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Equipment type">{equipment}</Field>
                <Field label="Fleet size">{lead.fleetSize}</Field>
                {isCarrier ? (
                  <Field label="Preferred lanes" wide>
                    {lead.preferredLanes}
                  </Field>
                ) : null}
              </dl>
            </Panel>
          ) : null}

          <Panel id="message-heading" title={isContact ? "Message" : "Additional message"}>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {isContact ? (
                <>
                  <Field label="Topic">
                    {lead.inquiryType
                      ? inquiryTypeLabel(lead.inquiryType as InquiryTypeValue)
                      : null}
                  </Field>
                  <Field label="Subject">{lead.subject}</Field>
                </>
              ) : null}
              <div className="sm:col-span-2">
                <dt className="label-caps text-gray">Message</dt>
                <dd className="mt-1 text-foreground">
                  {lead.message ? (
                    <p className="[overflow-wrap:anywhere] whitespace-pre-wrap">{lead.message}</p>
                  ) : (
                    <Missing />
                  )}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel id="notes-heading" title="Notes">
            {lead.notes.length === 0 ? (
              <p className="text-sm text-gray">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {lead.notes.map((note) => (
                  <NoteItem key={note.id} note={note} />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel id="status-heading" title="Status">
            <p className="flex items-center gap-2">
              <Badge tone={leadStatusTone(lead.status)} dot>
                {leadStatusLabel(lead.status)}
              </Badge>
            </p>
            {status ? <p className="mt-3 text-sm text-gray">{status.description}</p> : null}
          </Panel>

          <Panel id="dates-heading" title="Details">
            <dl className="space-y-4">
              <Field label="Submitted">
                <LocalTime iso={lead.createdAt} />
              </Field>
              <Field label="Last updated">
                <LocalTime iso={lead.updatedAt} />
              </Field>
              <Field label="First contacted">
                {lead.contactedAt ? <LocalTime iso={lead.contactedAt} /> : null}
              </Field>
              <Field label="Submitted from">{lead.sourcePage}</Field>
            </dl>
          </Panel>

          <Panel id="activity-heading" title="Activity">
            <Timeline lead={lead} />
          </Panel>
        </div>
      </div>
    </article>
  );
}

export function LeadDetailSkeleton() {
  return (
    <SkeletonGroup label="Loading lead" className="space-y-6">
      <Skeleton className="h-5 w-28" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-72 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </SkeletonGroup>
  );
}
