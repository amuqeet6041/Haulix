import { describe, expect, it } from "vitest";

import {
  badgeToneClasses,
  leadStatuses,
  leadStatusLabel,
  leadStatusTone,
  leadStatusValues,
  leadTypeLabel,
  leadTypeValues,
} from "@/content/lead-status";
import { LeadStatus, LeadType } from "@/generated/prisma/enums";
import {
  DEFAULT_LEAD_PAGE_SIZE,
  LEAD_SEARCH_MAX,
  leadIdSchema,
  leadListPageQuerySchema,
  leadListQuerySchema,
  leadNoteSchema,
  leadStatusUpdateSchema,
  NOTE_BODY_MAX,
  searchParamsToRecord,
} from "@/validations/admin-leads";

const CUID = "cmi4x2k7p0000abcd1234efgh";

describe("lead status content", () => {
  it("matches the Prisma enums exactly, in workflow order", () => {
    expect(leadStatusValues).toEqual(Object.values(LeadStatus));
    expect([...leadTypeValues].sort()).toEqual(Object.values(LeadType).sort());
  });

  it("gives every status a label, description and a known tone", () => {
    for (const status of leadStatuses) {
      expect(status.label.length).toBeGreaterThan(0);
      expect(status.description.length).toBeGreaterThan(0);
      expect(badgeToneClasses[status.tone]).toBeTruthy();
    }
  });

  it("uses only palette colors in badge classes", () => {
    const palette =
      /^(?:bg|text|border)-(?:orange-soft|orange|cream|gray|ink|destructive)(?:\/\d+)?$/;
    for (const classes of Object.values(badgeToneClasses)) {
      for (const name of classes.split(/\s+/)) expect(name).toMatch(palette);
    }
  });

  it("falls back gracefully for unknown values", () => {
    expect(leadStatusLabel("CONTACTED")).toBe("Contacted");
    expect(leadStatusLabel("WHATEVER")).toBe("WHATEVER");
    expect(leadStatusTone("WHATEVER")).toBe("muted");
    expect(leadTypeLabel("CARRIER_INQUIRY")).toBe("Carrier inquiry");
    expect(leadTypeLabel("CARRIER_INQUIRY", { short: true })).toBe("Carrier");
    expect(leadTypeLabel("OTHER")).toBe("OTHER");
  });
});

describe("leadListQuerySchema (API, strict)", () => {
  it("applies defaults to an empty query", () => {
    expect(leadListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: DEFAULT_LEAD_PAGE_SIZE,
      sort: "createdAt",
      dir: "desc",
    });
  });

  it("treats blank values as not provided", () => {
    const result = leadListQuerySchema.parse({ page: "", type: "", status: " ", q: "  " });
    expect(result).toMatchObject({ page: 1 });
    expect(result.type).toBeUndefined();
    expect(result.status).toBeUndefined();
    expect(result.q).toBeUndefined();
  });

  it("coerces and accepts valid values", () => {
    expect(
      leadListQuerySchema.parse({
        page: "3",
        pageSize: "50",
        type: "CONTACT",
        status: "QUALIFIED",
        q: "  jane  ",
        sort: "fullName",
        dir: "asc",
      }),
    ).toEqual({
      page: 3,
      pageSize: 50,
      type: "CONTACT",
      status: "QUALIFIED",
      q: "jane",
      sort: "fullName",
      dir: "asc",
    });
  });

  it.each([
    ["page", "0"],
    ["page", "1.5"],
    ["page", "abc"],
    ["page", "999999"],
    ["pageSize", "20"],
    ["pageSize", "1000"],
    ["type", "NEWSLETTER"],
    ["status", "new"],
    ["sort", "email"],
    ["dir", "up"],
    ["q", "x".repeat(LEAD_SEARCH_MAX + 1)],
  ])("rejects %s=%s with a field error", (field, value) => {
    const result = leadListQuerySchema.safeParse({ [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });
});

describe("leadListPageQuerySchema (pages, lenient)", () => {
  it("never fails: bad values fall back to defaults", () => {
    expect(
      leadListPageQuerySchema.parse({
        page: "-4",
        pageSize: "7",
        type: "nope",
        status: "nope",
        sort: "drop table",
        dir: "sideways",
      }),
    ).toEqual({ page: 1, pageSize: DEFAULT_LEAD_PAGE_SIZE, sort: "createdAt", dir: "desc" });
  });

  it("keeps good values and cuts an over-long search instead of dropping it", () => {
    const result = leadListPageQuerySchema.parse({
      page: "2",
      status: "NEW",
      q: "y".repeat(300),
    });
    expect(result.page).toBe(2);
    expect(result.status).toBe("NEW");
    expect(result.q).toHaveLength(LEAD_SEARCH_MAX);
  });
});

describe("searchParamsToRecord", () => {
  it("keeps the first value of repeated keys", () => {
    expect(searchParamsToRecord(new URLSearchParams("status=NEW&status=SPAM&q=a"))).toEqual({
      status: "NEW",
      q: "a",
    });
    expect(searchParamsToRecord({ status: ["NEW", "SPAM"], q: "a", empty: undefined })).toEqual({
      status: "NEW",
      q: "a",
    });
  });
});

describe("ids, status updates and notes", () => {
  it("accepts cuid lead ids and rejects anything else", () => {
    expect(leadIdSchema.safeParse(CUID).success).toBe(true);
    for (const bad of ["", "1", "../etc/passwd", "seed-001", "a b c d e f g h", 42]) {
      expect(leadIdSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("validates a status update and refuses extra keys", () => {
    expect(leadStatusUpdateSchema.parse({ status: "CONTACTED", expectedStatus: "NEW" })).toEqual({
      status: "CONTACTED",
      expectedStatus: "NEW",
    });
    expect(leadStatusUpdateSchema.safeParse({ status: "CONTACTED" }).success).toBe(true);
    expect(leadStatusUpdateSchema.safeParse({ status: "DONE" }).success).toBe(false);
    expect(leadStatusUpdateSchema.safeParse({}).success).toBe(false);
    expect(
      leadStatusUpdateSchema.safeParse({ status: "CONTACTED", contactedAt: "2000-01-01" }).success,
    ).toBe(false);
  });

  it("trims a note and enforces 1 to 5000 characters", () => {
    expect(leadNoteSchema.parse({ body: "  Called, left a voicemail.  " })).toEqual({
      body: "Called, left a voicemail.",
    });
    expect(leadNoteSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(leadNoteSchema.safeParse({ body: "x".repeat(NOTE_BODY_MAX) }).success).toBe(true);
    expect(leadNoteSchema.safeParse({ body: "x".repeat(NOTE_BODY_MAX + 1) }).success).toBe(false);
    expect(leadNoteSchema.safeParse({ body: "ok", authorId: "someone" }).success).toBe(false);
  });
});
