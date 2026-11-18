// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildLeadTimeline, UNKNOWN_ACTOR } from "@/lib/lead-timeline";
import type { AdminLeadActivity, AdminLeadDetail } from "@/types/admin";

function detail(overrides: Partial<AdminLeadDetail> = {}): AdminLeadDetail {
  return {
    id: "cmi4x2k7p0000abcd1234efgh",
    type: "CARRIER_INQUIRY",
    status: "NEW",
    fullName: "Jane Driver",
    email: "jane@example.com",
    phone: null,
    companyName: null,
    equipment: null,
    fleetSize: null,
    inquiryType: null,
    createdAt: "2026-11-10T10:00:00.000Z",
    updatedAt: "2026-11-10T10:00:00.000Z",
    mcNumber: null,
    dotNumber: null,
    preferredLanes: null,
    subject: null,
    message: null,
    sourcePage: "/get-started",
    notifiedAt: "2026-11-10T10:00:05.000Z",
    confirmationSentAt: "2026-11-10T10:00:06.000Z",
    contactedAt: null,
    notes: [],
    activity: [],
    ...overrides,
  };
}

function activity(overrides: Partial<AdminLeadActivity>): AdminLeadActivity {
  return {
    id: "a1",
    action: "STATUS_CHANGED",
    actor: { id: "u1", name: "Abdul Muqeet" },
    fromStatus: "NEW",
    toStatus: "CONTACTED",
    noteId: null,
    createdAt: "2026-11-11T09:00:00.000Z",
    ...overrides,
  };
}

const titles = (lead: AdminLeadDetail) => buildLeadTimeline(lead).map((item) => item.title);

describe("buildLeadTimeline: system events", () => {
  it("lists the submission and both emails for a fresh lead, newest first", () => {
    expect(titles(detail())).toEqual([
      "Confirmation email sent to the submitter",
      "Team notification email sent",
      "Carrier inquiry submitted",
    ]);
  });

  it("names the submission by lead type", () => {
    expect(titles(detail({ type: "CONTACT" }))).toContain("Contact message submitted");
    expect(titles(detail({ type: "CARRIER_INQUIRY" }))).toContain("Carrier inquiry submitted");
  });

  it('shows an explicit "not sent" entry when the notification email never went out', () => {
    const items = buildLeadTimeline(detail({ notifiedAt: null }));
    const missing = items.find((item) => item.id === "notification-not-sent")!;
    expect(missing).toMatchObject({
      title: "Team notification email was not sent",
      at: null,
      tone: "warning",
    });
    expect(items.some((item) => item.id === "notification-sent")).toBe(false);
  });

  it('shows an explicit "not sent" entry when the confirmation email never went out', () => {
    const items = buildLeadTimeline(detail({ confirmationSentAt: null }));
    expect(items.find((item) => item.id === "confirmation-not-sent")).toMatchObject({
      title: "Confirmation email to the submitter was not sent",
      at: null,
      tone: "warning",
    });
  });

  it("shows both warnings when neither email was sent, just above the submission", () => {
    const items = buildLeadTimeline(detail({ notifiedAt: null, confirmationSentAt: null }));
    expect(items.map((item) => item.id)).toEqual([
      "confirmation-not-sent",
      "notification-not-sent",
      "submitted",
    ]);
  });

  it("includes the first-contact time only when there is one", () => {
    expect(titles(detail())).not.toContain("First marked as contacted");
    const items = buildLeadTimeline(detail({ contactedAt: "2026-11-12T08:00:00.000Z" }));
    expect(items[0]).toMatchObject({
      id: "first-contacted",
      title: "First marked as contacted",
      tone: "positive",
    });
  });
});

describe("buildLeadTimeline: admin activity", () => {
  it("describes a status change with readable labels and who made it", () => {
    const items = buildLeadTimeline(detail({ activity: [activity({})] }));
    expect(items[0]).toMatchObject({
      title: "Status changed from New to Contacted",
      actor: "Abdul Muqeet",
      at: "2026-11-11T09:00:00.000Z",
    });
  });

  it("describes every note action", () => {
    const lead = detail({
      activity: [
        activity({ id: "n1", action: "NOTE_ADDED", fromStatus: null, toStatus: null }),
        activity({ id: "n2", action: "NOTE_EDITED", fromStatus: null, toStatus: null }),
        activity({ id: "n3", action: "NOTE_DELETED", fromStatus: null, toStatus: null }),
      ],
    });
    expect(titles(lead)).toEqual(
      expect.arrayContaining(["Note added", "Note edited", "Note deleted"]),
    );
  });

  it("handles a status change with a missing from or to status", () => {
    const lead = detail({ activity: [activity({ fromStatus: null })] });
    expect(titles(lead)).toContain("Status changed");
  });

  it("names a deleted account as a former team member", () => {
    const items = buildLeadTimeline(detail({ activity: [activity({ actor: null })] }));
    expect(items[0]!.actor).toBe(UNKNOWN_ACTOR);
  });

  it("does not break on an action it does not know yet", () => {
    const lead = detail({
      activity: [activity({ action: "SOMETHING_NEW" as AdminLeadActivity["action"] })],
    });
    expect(titles(lead)).toContain("Lead updated");
  });

  it("orders everything newest first, merging system events and activity", () => {
    const lead = detail({
      contactedAt: "2026-11-12T08:00:00.000Z",
      activity: [
        activity({
          id: "late",
          createdAt: "2026-11-15T09:00:00.000Z",
          toStatus: "QUALIFIED",
          fromStatus: "CONTACTED",
        }),
        activity({ id: "early", createdAt: "2026-11-12T08:00:00.000Z" }),
      ],
    });
    const items = buildLeadTimeline(lead);
    const times = items.filter((item) => item.at).map((item) => new Date(item.at!).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(items[0]!.id).toBe("activity-late");
    expect(items[items.length - 1]!.id).toBe("submitted");
  });

  it("is stable for entries with identical times", () => {
    const lead = detail({
      activity: [
        activity({ id: "b", createdAt: "2026-11-11T09:00:00.000Z" }),
        activity({ id: "a", createdAt: "2026-11-11T09:00:00.000Z" }),
      ],
    });
    expect(buildLeadTimeline(lead).map((item) => item.id)).toEqual(
      buildLeadTimeline(lead).map((item) => item.id),
    );
  });

  it("does not modify the lead it is given", () => {
    const lead = detail({ activity: [activity({})] });
    const copy = JSON.stringify(lead);
    buildLeadTimeline(lead);
    expect(JSON.stringify(lead)).toBe(copy);
  });
});
