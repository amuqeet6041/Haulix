// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { getMissingEmailConfig, isEmailConfigured } from "@/lib/email/client";
import { describeError } from "@/lib/log";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("email configuration", () => {
  it("is configured only when the API key and the inbox are both set", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("CONTACT_EMAIL", "team@example.com");
    expect(isEmailConfigured()).toBe(true);
    expect(getMissingEmailConfig()).toEqual([]);
  });

  it("reports the missing inbox when only the API key is set", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("CONTACT_EMAIL", "");
    expect(isEmailConfigured()).toBe(false);
    expect(getMissingEmailConfig()).toEqual(["CONTACT_EMAIL"]);
  });

  it("reports the missing key when only the inbox is set", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTACT_EMAIL", "team@example.com");
    expect(getMissingEmailConfig()).toEqual(["RESEND_API_KEY"]);
  });

  it("treats whitespace-only values as missing", () => {
    vi.stubEnv("RESEND_API_KEY", "   ");
    vi.stubEnv("CONTACT_EMAIL", " ");
    expect(getMissingEmailConfig()).toEqual(["RESEND_API_KEY", "CONTACT_EMAIL"]);
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
