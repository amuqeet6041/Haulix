"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  leadStatusLabel,
  leadStatuses,
  leadStatusTone,
  type LeadStatusValue,
} from "@/content/lead-status";

/**
 * The one editable part of the lead detail page: change the lead's status.
 *
 * Choosing a status changes nothing by itself. "Update status" opens a
 * confirmation, and only confirming sends the request. While it runs the
 * dialog's buttons are disabled and a ref blocks a second request, so a double
 * click cannot send two. The result is announced with a toast, and on success
 * the page's server data is refreshed so the badge, activity, dashboard and
 * leads list show the new status.
 */

export const STATUS_ERROR = {
  network: "We could not reach the server. Check your connection and try again.",
  unexpected: "We could not update the status. Please try again.",
  conflict: "This lead was updated by someone else. We refreshed it, so please check its status.",
} as const;

interface ApiBody {
  ok?: unknown;
  message?: unknown;
  changed?: unknown;
  lead?: { status?: unknown };
}

type Outcome =
  | { kind: "updated"; status: LeadStatusValue }
  | { kind: "unchanged"; status: LeadStatusValue }
  | { kind: "conflict" }
  | { kind: "error"; message: string };

const isStatus = (value: unknown): value is LeadStatusValue =>
  typeof value === "string" && leadStatuses.some((status) => status.value === value);

/** Sends the change and turns every possible response into one Outcome. */
async function requestStatusChange(
  leadId: string,
  status: LeadStatusValue,
  expectedStatus: LeadStatusValue,
): Promise<Outcome> {
  let response: Response;
  try {
    response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, expectedStatus }),
    });
  } catch {
    return { kind: "error", message: STATUS_ERROR.network };
  }

  let body: ApiBody = {};
  try {
    body = (await response.json()) as ApiBody;
  } catch {
    // Not JSON (an HTML error page, an empty body): handled by the status below.
  }

  if (response.status === 409) return { kind: "conflict" };
  if (response.ok && body.ok === true && isStatus(body.lead?.status)) {
    return body.changed === true
      ? { kind: "updated", status: body.lead.status }
      : { kind: "unchanged", status: body.lead.status };
  }
  if (response.status === 401 || response.status === 403) {
    return { kind: "error", message: "Your session has ended. Please sign in again." };
  }
  // The server's messages are generic and safe to show (they never carry details).
  const message =
    typeof body.message === "string" && body.message ? body.message : STATUS_ERROR.unexpected;
  return { kind: "error", message };
}

export function LeadStatusControl({
  leadId,
  status: serverStatus,
}: {
  leadId: string;
  /** The status the server rendered. The control re-syncs when it changes. */
  status: LeadStatusValue;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [current, setCurrent] = useState<LeadStatusValue>(serverStatus);
  const [selected, setSelected] = useState<LeadStatusValue>(serverStatus);
  // When the server sends a different status (after a refresh, or a change made
  // elsewhere), adopt it. Adjusting state during render avoids a remount, which
  // would lose focus and close an open dialog.
  const [seenServer, setSeenServer] = useState(serverStatus);
  if (serverStatus !== seenServer) {
    setSeenServer(serverStatus);
    setCurrent(serverStatus);
    setSelected(serverStatus);
  }
  const [open, setOpen] = useState(false);
  const inFlight = useRef(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unchanged = selected === current;
  const isHeavy = selected === "REJECTED" || selected === "SPAM";

  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const outcome = await requestStatusChange(leadId, selected, current);

      if (outcome.kind === "updated") {
        setCurrent(outcome.status);
        setSelected(outcome.status);
        toast.success("Status updated", `This lead is now ${leadStatusLabel(outcome.status)}.`);
      } else if (outcome.kind === "unchanged") {
        setCurrent(outcome.status);
        setSelected(outcome.status);
        toast.info("No change", `This lead was already ${leadStatusLabel(outcome.status)}.`);
      } else if (outcome.kind === "conflict") {
        toast.error("Status not updated", STATUS_ERROR.conflict);
      } else {
        toast.error("Status not updated", outcome.message);
        // Keep the dialog open so the person can retry or cancel.
        throw new Error("status update failed");
      }

      // Re-render the server data: badge, activity, and the other pages.
      startTransition(() => router.refresh());
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div>
      <p className="flex items-center gap-2 text-sm text-gray">
        <span>Current status:</span>
        <Badge tone={leadStatusTone(current)} dot>
          {leadStatusLabel(current)}
        </Badge>
      </p>
      <p className="mt-3 text-sm text-gray">
        {leadStatuses.find((status) => status.value === current)?.description}
      </p>
      <div className="mt-5 border-t border-border" />

      <div className="mt-5">
        <Label htmlFor="lead-status-select">Change status</Label>
        <Select
          ref={selectRef}
          id="lead-status-select"
          className="mt-1.5"
          value={selected}
          aria-describedby="lead-status-hint"
          onChange={(event) => setSelected(event.target.value as LeadStatusValue)}
        >
          {leadStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
              {status.value === current ? " (current)" : ""}
            </option>
          ))}
        </Select>
        <p id="lead-status-hint" className="mt-2 text-xs text-gray">
          Pick a status, then choose Update status. Nothing changes until you confirm.
        </p>
      </div>

      <Button
        ref={buttonRef}
        type="button"
        className="mt-4 w-full"
        disabled={unchanged}
        onClick={() => setOpen(true)}
      >
        Update status
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Change status to ${leadStatusLabel(selected)}?`}
        description={`This lead will change from ${leadStatusLabel(current)} to ${leadStatusLabel(selected)}. The change is recorded in the lead's activity history.`}
        confirmLabel={`Change to ${leadStatusLabel(selected)}`}
        tone={isHeavy ? "destructive" : "default"}
        onConfirm={confirm}
        // After a successful change the button is disabled (nothing left to
        // update), so focus goes to the selector; after cancelling, back to the button.
        returnFocus={() => (unchanged ? selectRef.current : buttonRef.current)}
      />
    </div>
  );
}
