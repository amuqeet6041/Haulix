// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminAllowlist, isAllowlistedAdmin } from "@/lib/admin-allowlist";
import {
  passwordProblems,
  provisionAdmin,
  type ProvisioningDeps,
  type ProvisioningError,
} from "@/lib/admin-provisioning";

const EMAIL = "owner@haulix.test";
const PASSWORD = "Correct-Horse-42!";

function fakeDeps(existing: { id: string; role: string | null } | null = null) {
  const deps = {
    createUser: vi.fn<ProvisioningDeps["createUser"]>(async () => ({ id: "user_1" })),
    hashPassword: vi.fn<ProvisioningDeps["hashPassword"]>(async () => "hashed"),
    findUserByEmail: vi.fn<ProvisioningDeps["findUserByEmail"]>(async () => existing),
    markEmailVerified: vi.fn<ProvisioningDeps["markEmailVerified"]>(async () => {}),
    resetAdmin: vi.fn<ProvisioningDeps["resetAdmin"]>(async () => {}),
  };
  return deps;
}

async function expectCode(promise: Promise<unknown>, code: ProvisioningError["code"]) {
  await expect(promise).rejects.toMatchObject({ name: "ProvisioningError", code });
}

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", ` ${EMAIL.toUpperCase()} , second@haulix.test,,`);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin allowlist", () => {
  it("parses ADMIN_EMAILS case-insensitively and ignores blanks", () => {
    expect(getAdminAllowlist()).toEqual([EMAIL, "second@haulix.test"]);
    expect(isAllowlistedAdmin("Owner@HAULIX.test")).toBe(true);
    expect(isAllowlistedAdmin("other@haulix.test")).toBe(false);
    expect(isAllowlistedAdmin(undefined)).toBe(false);
  });

  it("allows nobody when ADMIN_EMAILS is empty", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAllowlistedAdmin(EMAIL)).toBe(false);
  });
});

describe("passwordProblems (length only, 6 to 128)", () => {
  it.each([
    ["six characters", "abcdef"],
    ["letters only", "lowercaseonly"],
    ["the email name", "owner123"],
    ["128 characters", "x".repeat(128)],
    ["a mixed password", PASSWORD],
  ])("accepts %s", (_, password) => {
    expect(passwordProblems(password)).toEqual([]);
  });

  it.each([
    ["five characters", "abcde"],
    ["an empty password", ""],
    ["129 characters", "x".repeat(129)],
  ])("rejects %s", (_, password) => {
    expect(passwordProblems(password).length).toBeGreaterThan(0);
  });
});

describe("provisionAdmin", () => {
  it("creates an allowlisted admin with the admin role and marks the email verified", async () => {
    const deps = fakeDeps();
    await expect(
      provisionAdmin(
        { email: ` ${EMAIL.toUpperCase()} `, name: "Owner", password: PASSWORD },
        deps,
      ),
    ).resolves.toEqual({ status: "created", userId: "user_1" });
    expect(deps.createUser).toHaveBeenCalledWith({
      email: EMAIL,
      password: PASSWORD,
      name: "Owner",
      role: "admin",
    });
    expect(deps.markEmailVerified).toHaveBeenCalledWith("user_1");
  });

  it("refuses an email that is not allowlisted", async () => {
    const deps = fakeDeps();
    await expectCode(
      provisionAdmin({ email: "intruder@example.com", name: "X Y", password: PASSWORD }, deps),
      "not_allowlisted",
    );
    expect(deps.createUser).not.toHaveBeenCalled();
  });

  it("refuses everything when the allowlist is empty", async () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    await expectCode(
      provisionAdmin({ email: EMAIL, name: "Owner", password: PASSWORD }, fakeDeps()),
      "not_allowlisted",
    );
  });

  it("refuses a weak password without echoing it", async () => {
    const promise = provisionAdmin({ email: EMAIL, name: "Owner", password: "shrt1" }, fakeDeps());
    await expectCode(promise, "weak_password");
    await promise.catch((error: Error) => expect(error.message).not.toContain("shrt1"));
  });

  it("refuses invalid emails and names", async () => {
    await expectCode(
      provisionAdmin({ email: "nope", name: "Owner", password: PASSWORD }, fakeDeps()),
      "invalid_email",
    );
    await expectCode(
      provisionAdmin({ email: EMAIL, name: " ", password: PASSWORD }, fakeDeps()),
      "invalid_name",
    );
  });

  it("never silently changes an existing account", async () => {
    const deps = fakeDeps({ id: "user_9", role: "carrier" });
    await expectCode(
      provisionAdmin({ email: EMAIL, name: "Owner", password: PASSWORD }, deps),
      "already_exists",
    );
    expect(deps.resetAdmin).not.toHaveBeenCalled();
    expect(deps.createUser).not.toHaveBeenCalled();
  });

  it("resets the password and admin role only with resetPassword", async () => {
    const deps = fakeDeps({ id: "user_9", role: "admin" });
    await expect(
      provisionAdmin(
        { email: EMAIL, name: "unused", password: PASSWORD, resetPassword: true },
        deps,
      ),
    ).resolves.toEqual({ status: "reset", userId: "user_9" });
    expect(deps.hashPassword).toHaveBeenCalledWith(PASSWORD);
    expect(deps.resetAdmin).toHaveBeenCalledWith("user_9", "hashed");
  });

  it("does not create an account when asked to reset a missing one", async () => {
    const deps = fakeDeps(null);
    await expectCode(
      provisionAdmin(
        { email: EMAIL, name: "Owner", password: PASSWORD, resetPassword: true },
        deps,
      ),
      "not_found",
    );
    expect(deps.createUser).not.toHaveBeenCalled();
  });

  it("wraps unexpected failures without leaking details", async () => {
    const deps = fakeDeps();
    deps.createUser.mockRejectedValue(new Error(`db said ${PASSWORD}`));
    const promise = provisionAdmin({ email: EMAIL, name: "Owner", password: PASSWORD }, deps);
    await expectCode(promise, "failed");
    await promise.catch((error: Error) => expect(error.message).not.toContain(PASSWORD));
  });
});
