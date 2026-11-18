// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/admin-provisioning";
import { describeDevice } from "@/lib/device-label";
import { AdminAccessError, evaluateAdminSession } from "@/lib/admin-guard";
import { getAccountProfile } from "@/services/admin-account.service";
import {
  ACCOUNT_NAME_MAX,
  ACCOUNT_PASSWORD_MAX,
  ACCOUNT_PASSWORD_MIN,
  accountProfileSchema,
  firstErrors,
  passwordChangeSchema,
  sessionIdSchema,
} from "@/validations/admin-account";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), configured: { value: true } }));
vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: () => mocks.configured.value,
  getPrisma: () => ({ user: { findUnique: mocks.findUnique } }),
}));

describe("accountProfileSchema", () => {
  it("trims and accepts a normal name", () => {
    expect(accountProfileSchema.parse({ name: "  Abdul Muqeet " })).toEqual({
      name: "Abdul Muqeet",
    });
  });

  it.each([
    {},
    { name: "" },
    { name: "   " },
    { name: 5 },
    { name: "x".repeat(ACCOUNT_NAME_MAX + 1) },
  ])("rejects %j", (input) => {
    expect(accountProfileSchema.safeParse(input).success).toBe(false);
  });

  it("accepts a name of exactly the maximum length", () => {
    expect(accountProfileSchema.safeParse({ name: "x".repeat(ACCOUNT_NAME_MAX) }).success).toBe(
      true,
    );
  });

  it.each(["role", "email", "userId", "emailVerified", "banned", "image"])(
    "refuses a request that tries to set %s",
    (field) => {
      expect(accountProfileSchema.safeParse({ name: "A", [field]: "x" }).success).toBe(false);
    },
  );
});

describe("passwordChangeSchema", () => {
  const valid = {
    currentPassword: "OldPassword1",
    newPassword: "NewPassword2",
    confirmPassword: "NewPassword2",
  };

  it("accepts a valid change", () => {
    expect(passwordChangeSchema.safeParse(valid).success).toBe(true);
  });

  it("allows a simple six-character password and parts of the email (the owner's policy)", () => {
    const simple = { currentPassword: "old", newPassword: "admin1", confirmPassword: "admin1" };
    expect(passwordChangeSchema.safeParse(simple).success).toBe(true);
  });

  it.each([
    ["missing current password", { ...valid, currentPassword: "" }, "currentPassword"],
    ["too short", { ...valid, newPassword: "12345", confirmPassword: "12345" }, "newPassword"],
    [
      "too long",
      { ...valid, newPassword: "x".repeat(129), confirmPassword: "x".repeat(129) },
      "newPassword",
    ],
    ["mismatched confirmation", { ...valid, confirmPassword: "Different3" }, "confirmPassword"],
    ["missing confirmation", { ...valid, confirmPassword: "" }, "confirmPassword"],
    [
      "same as current",
      { currentPassword: "SamePass1", newPassword: "SamePass1", confirmPassword: "SamePass1" },
      "newPassword",
    ],
  ])("rejects a %s, naming the field", (_name, input, field) => {
    const result = passwordChangeSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(firstErrors(result.error))).toContain(field);
  });

  it("matches the limits Better Auth and the provisioning script enforce", () => {
    expect(ACCOUNT_PASSWORD_MIN).toBe(PASSWORD_MIN);
    expect(ACCOUNT_PASSWORD_MAX).toBe(PASSWORD_MAX);
  });
});

describe("sessionIdSchema", () => {
  it.each(["abc123", "A_b-C", "x".repeat(128)])("accepts %s", (id) => {
    expect(sessionIdSchema.safeParse(id).success).toBe(true);
  });
  it.each(["", "a b", "../x", "a/b", "x".repeat(129), "a;b", "%00", "é"])("rejects %j", (id) => {
    expect(sessionIdSchema.safeParse(id).success).toBe(false);
  });
});

describe("describeDevice", () => {
  it.each([
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Chrome on Windows",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0",
      "Edge on Windows",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
      "Safari on macOS",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      "Safari on iOS",
    ],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0", "Firefox on Linux"],
    [
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
      "Chrome on Android",
    ],
  ])("labels %s", (agent, label) => {
    expect(describeDevice(agent)).toBe(label);
  });

  it("falls back safely for missing or unknown agents", () => {
    expect(describeDevice(null)).toBe("Unknown device");
    expect(describeDevice(undefined)).toBe("Unknown device");
    expect(describeDevice("")).toBe("Unknown device");
    expect(describeDevice("curl/8.0")).toBe("Unknown device");
  });

  it("never echoes the raw user agent back", () => {
    expect(describeDevice("<script>alert(1)</script> Chrome/1 Windows")).toBe("Chrome on Windows");
  });
});

describe("getAccountProfile", () => {
  const admin = () => {
    const result = evaluateAdminSession({
      session: { id: "s", userId: "user_1", expiresAt: new Date(Date.now() + 60_000) },
      user: { id: "user_1", email: "admin@haulix.test", name: "Admin", role: "admin" },
    });
    if (!result.ok) throw new Error("not authorized");
    return result.admin;
  };

  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "admin@haulix.test");
    mocks.configured.value = true;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    mocks.findUnique.mockReset();
  });

  it("reads only the account holder's own safe fields, using the verified user id", async () => {
    mocks.findUnique.mockResolvedValue({
      name: "Admin",
      email: "admin@haulix.test",
      role: "admin",
      createdAt: new Date("2026-11-01T09:00:00Z"),
      password: "leaked-hash",
    });
    const result = await getAccountProfile(admin());
    expect(result).toEqual({
      ok: true,
      data: {
        name: "Admin",
        email: "admin@haulix.test",
        role: "admin",
        memberSince: "2026-11-01T09:00:00.000Z",
      },
    });
    const args = mocks.findUnique.mock.calls[0]![0];
    expect(args.where).toEqual({ id: "user_1" });
    expect(Object.keys(args.select).sort()).toEqual(["createdAt", "email", "name", "role"]);
    expect(JSON.stringify(result)).not.toContain("leaked");
  });

  it("refuses a forged context and reports a missing database or user safely", async () => {
    await expect(getAccountProfile({ userId: "user_1" })).rejects.toBeInstanceOf(AdminAccessError);
    expect(mocks.findUnique).not.toHaveBeenCalled();

    mocks.findUnique.mockResolvedValue(null);
    await expect(getAccountProfile(admin())).resolves.toEqual({ ok: false, reason: "not_found" });
    mocks.configured.value = false;
    await expect(getAccountProfile(admin())).resolves.toEqual({
      ok: false,
      reason: "not_configured",
    });
  });
});
