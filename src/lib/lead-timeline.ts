import { leadStatusLabel } from "@/content/lead-status";
import type { AdminLeadDetail } from "@/types/admin";

/**
 * Builds the activity timeline shown on the lead detail page. Pure function
 * over the already-loaded lead: no database access, no new data.
 *
 * It merges what the system knows (submission, the two emails, first contact)
 * with the recorded admin activity (status changes and note changes), newest
 * first. A missing email timestamp becomes an explicit "not sent" entry, so a
 * lead whose notification never went out is visible, not silently absent.
 */

export type TimelineTone = "default" | "positive" | "warning";

export interface TimelineItem {
  id: string;
  /** Short sentence, e.g. "Status changed from New to Contacted". */
  title: string;
  /** Who did it, when an admin did. */
  actor?: string;
  /** ISO time, or null for entries with no time (an email that was never sent). */
  at: string | null;
  tone: TimelineTone;
}

/** Used when an admin account no longer exists or the note was imported. */
export const UNKNOWN_ACTOR = "A former team member";

function actorName(actor: { name: string } | null): string {
  return actor?.name.trim() || UNKNOWN_ACTOR;
}

interface Ranked extends TimelineItem {
  /** Tie-break for equal times: lower comes first (newer in the list). */
  rank: number;
}

export function buildLeadTimeline(lead: AdminLeadDetail): TimelineItem[] {
  const items: Ranked[] = [];

  items.push({
    id: "submitted",
    title: lead.type === "CONTACT" ? "Contact message submitted" : "Carrier inquiry submitted",
    at: lead.createdAt,
    tone: "default",
    rank: 90,
  });

  items.push(
    lead.notifiedAt
      ? {
          id: "notification-sent",
          title: "Team notification email sent",
          at: lead.notifiedAt,
          tone: "default",
          rank: 70,
        }
      : {
          id: "notification-not-sent",
          title: "Team notification email was not sent",
          at: null,
          tone: "warning",
          rank: 80,
        },
  );

  items.push(
    lead.confirmationSentAt
      ? {
          id: "confirmation-sent",
          title: "Confirmation email sent to the submitter",
          at: lead.confirmationSentAt,
          tone: "default",
          rank: 70,
        }
      : {
          id: "confirmation-not-sent",
          title: "Confirmation email to the submitter was not sent",
          at: null,
          tone: "warning",
          rank: 80,
        },
  );

  if (lead.contactedAt) {
    items.push({
      id: "first-contacted",
      title: "First marked as contacted",
      at: lead.contactedAt,
      tone: "positive",
      rank: 60,
    });
  }

  for (const entry of lead.activity) {
    const actor = actorName(entry.actor);
    let title: string;
    switch (entry.action) {
      case "STATUS_CHANGED":
        title =
          entry.fromStatus && entry.toStatus
            ? `Status changed from ${leadStatusLabel(entry.fromStatus)} to ${leadStatusLabel(entry.toStatus)}`
            : "Status changed";
        break;
      case "NOTE_ADDED":
        title = "Note added";
        break;
      case "NOTE_EDITED":
        title = "Note edited";
        break;
      case "NOTE_DELETED":
        title = "Note deleted";
        break;
      default:
        // An action added by a later step that this page does not know yet.
        title = "Lead updated";
    }
    items.push({
      id: `activity-${entry.id}`,
      title,
      actor,
      at: entry.createdAt,
      tone: "default",
      rank: 50,
    });
  }

  return items
    .sort((a, b) => {
      // Entries with no time sit just above the submission they belong to.
      const left = new Date(a.at ?? lead.createdAt).getTime();
      const right = new Date(b.at ?? lead.createdAt).getTime();
      return right - left || a.rank - b.rank || a.id.localeCompare(b.id);
    })
    .map(({ rank, ...item }) => {
      void rank;
      return item;
    });
}
