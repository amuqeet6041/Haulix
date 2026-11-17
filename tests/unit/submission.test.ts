// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  equipmentFromSearch,
  newSubmissionId,
  readSubmissionMeta,
  SUBMISSION_ID_HEADER,
  sourcePageFromReferer,
} from "@/lib/submission";

const origin = "https://haulix.test";
const uuid = "3f1c2b8e-5d4a-4c1e-9a7b-2e6f8d9c0a1b";

function request(headers: Record<string, string>, url = `${origin}/api/contact`): Request {
  return new Request(url, { method: "POST", headers });
}

describe("sourcePageFromReferer", () => {
  it("keeps only the path of a same-origin page", () => {
    expect(sourcePageFromReferer(`${origin}/contact?email=a@b.co#top`, [origin])).toBe("/contact");
    expect(sourcePageFromReferer(`${origin}/services/dry-van`, [origin])).toBe("/services/dry-van");
  });

  it("ignores other origins, API paths, junk and missing values", () => {
    expect(sourcePageFromReferer("https://evil.test/contact", [origin])).toBeUndefined();
    expect(sourcePageFromReferer(`${origin}/api/leads`, [origin])).toBeUndefined();
    expect(sourcePageFromReferer("not a url", [origin])).toBeUndefined();
    expect(sourcePageFromReferer(null, [origin])).toBeUndefined();
  });

  it("drops paths longer than the column allows", () => {
    expect(sourcePageFromReferer(`${origin}/${"a".repeat(600)}`, [origin])).toBeUndefined();
  });
});

describe("readSubmissionMeta", () => {
  it("reads the source page from Referer and the submission id from the header", () => {
    const meta = readSubmissionMeta(
      request({ referer: `${origin}/get-started?equipment=reefer`, [SUBMISSION_ID_HEADER]: uuid }),
    );
    expect(meta).toEqual({ sourcePage: "/get-started", submissionId: uuid });
  });

  it("accepts the configured site origin when the request host differs", () => {
    const meta = readSubmissionMeta(
      request(
        { referer: "https://www.haulix.example/contact" },
        "http://internal:3000/api/contact",
      ),
      "https://www.haulix.example",
    );
    expect(meta.sourcePage).toBe("/contact");
  });

  it("ignores a submission id that is not a UUID", () => {
    for (const value of ["abc", "1; DROP TABLE", "x".repeat(200)]) {
      expect(readSubmissionMeta(request({ [SUBMISSION_ID_HEADER]: value })).submissionId).toBe(
        undefined,
      );
    }
  });

  it("returns nothing when no metadata was sent", () => {
    expect(readSubmissionMeta(request({}))).toEqual({
      sourcePage: undefined,
      submissionId: undefined,
    });
  });
});

describe("newSubmissionId", () => {
  it("creates a fresh UUID each time", () => {
    const a = newSubmissionId();
    const b = newSubmissionId();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });
});

describe("equipmentFromSearch", () => {
  it("returns a known equipment slug", () => {
    expect(equipmentFromSearch("?equipment=reefer")).toBe("reefer");
    expect(equipmentFromSearch("?equipment=Flatbed")).toBe("flatbed");
  });

  it("ignores unknown, empty or missing values", () => {
    expect(equipmentFromSearch("?equipment=spaceship")).toBeUndefined();
    expect(equipmentFromSearch("?equipment=")).toBeUndefined();
    expect(equipmentFromSearch("")).toBeUndefined();
    expect(equipmentFromSearch("?equipment=<script>")).toBeUndefined();
  });
});
