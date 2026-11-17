// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getFromAddress,
  getMissingConfirmationConfig,
  getMissingEmailConfig,
  isEmailConfigured,
} from "@/lib/email/client";
import { describeError } from "@/lib/log";

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("FROM_EMAIL", "");
  vi.stubEnv("EMAIL_FROM", "");
  vi.stubEnv("CONTACT_EMAIL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("email configuration", () => {
  it("is configured only when the key, sender and inbox are all set", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("FROM_EMAIL", "HAULIX <dispatch@example.com>");
    vi.stubEnv("CONTACT_EMAIL", "team@example.com");
    expect(isEmailConfigured()).toBe(true);
    expect(getMissingEmailConfig()).toEqual([]);
  });

  it("names every missing variable, never its value", () => {
    expect(getMissingEmailConfig()).toEqual(["RESEND_API_KEY", "FROM_EMAIL", "CONTACT_EMAIL"]);
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    expect(getMissingEmailConfig()).toEqual(["FROM_EMAIL", "CONTACT_EMAIL"]);
    expect(getMissingEmailConfig().join()).not.toContain("re_test_key");
  });

  it("treats whitespace-only values as missing", () => {
    vi.stubEnv("RESEND_API_KEY", "   ");
    vi.stubEnv("FROM_EMAIL", " ");
    vi.stubEnv("CONTACT_EMAIL", " ");
    expect(getMissingEmailConfig()).toEqual(["RESEND_API_KEY", "FROM_EMAIL", "CONTACT_EMAIL"]);
  });

  it("has no hard-coded sender and still reads the older EMAIL_FROM name", () => {
    expect(getFromAddress()).toBe("");
    vi.stubEnv("EMAIL_FROM", "Legacy <old@example.com>");
    expect(getFromAddress()).toBe("Legacy <old@example.com>");
    vi.stubEnv("FROM_EMAIL", "New <new@example.com>");
    expect(getFromAddress()).toBe("New <new@example.com>");
  });

  it("does not need CONTACT_EMAIL for customer confirmations", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("FROM_EMAIL", "HAULIX <dispatch@example.com>");
    expect(getMissingConfirmationConfig()).toEqual([]);
    expect(getMissingEmailConfig()).toEqual(["CONTACT_EMAIL"]);
  });
});

describe("describeError", () => {
  it("keeps the name and code but drops the message", () => {
    const error = Object.assign(new Error("jane@example.com already exists"), { code: "P2002" });
    expect(describeError(error)).toBe("Error code=P2002");
  });

  it("handles provider error objects and unknown values", () => {
    expect(describeError({ name: "validation_error", statusCode: 422, message: "x" })).toBe(
      "validation_error status=422",
    );
    expect(describeError("boom")).toBe("UnknownError");
  });
});
