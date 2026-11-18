import { z } from "zod";

import { getAdminAllowlist, isAllowlistedAdmin } from "@/lib/admin-allowlist";
import { ADMIN_ROLE, type AppRole } from "@/lib/auth-roles";

/**
 * Admin account provisioning. The ONLY way to create an admin: there is no
 * public sign-up, and no role may create users or change roles over HTTP.
 * Used by `npm run admin:create` (scripts/create-admin.ts).
 *
 * Rules:
 * - The email must be in ADMIN_EMAILS.
 * - The password must meet the policy below; it is hashed by Better Auth and
 *   never logged or printed.
 * - An existing account is never silently changed: resetting its password and
 *   (re)granting the admin role requires the explicit `resetPassword` option.
 * - Accounts are password-only (two-factor is postponed). The admin signs in
 *   at /admin/login with the email and password set here.
 */

/** Owner's decision (2026-11-18): length only, minimum 6. Keep in sync with lib/auth.ts. */
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;

export class ProvisioningError extends Error {
  constructor(
    public readonly code:
      | "invalid_email"
      | "invalid_name"
      | "not_allowlisted"
      | "weak_password"
      | "already_exists"
      | "not_found"
      | "failed",
    message: string,
  ) {
    super(message);
    this.name = "ProvisioningError";
  }
}

/**
 * Problems with a proposed admin password (empty array means acceptable).
 * Only the length is checked: 6 to 128 characters. Any characters are allowed,
 * including the email name. Sign-in rate limiting still applies.
 */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN) problems.push(`Use at least ${PASSWORD_MIN} characters.`);
  if (password.length > PASSWORD_MAX) problems.push(`Use at most ${PASSWORD_MAX} characters.`);
  return problems;
}

/** Minimal surface of Better Auth and Prisma used here (lets tests inject fakes). */
export interface ProvisioningDeps {
  createUser(input: {
    email: string;
    password: string;
    name: string;
    role: AppRole;
  }): Promise<{ id: string }>;
  hashPassword(password: string): Promise<string>;
  findUserByEmail(email: string): Promise<{ id: string; role: string | null } | null>;
  markEmailVerified(userId: string): Promise<void>;
  /** Sets the credential password and admin role, and revokes the user's sessions. */
  resetAdmin(userId: string, passwordHash: string): Promise<void>;
}

export interface ProvisionInput {
  email: string;
  name: string;
  password: string;
  /** Allow resetting the password (and granting admin) on an existing account. */
  resetPassword?: boolean;
}

export type ProvisionResult = { status: "created" | "reset"; userId: string };

export async function provisionAdmin(
  input: ProvisionInput,
  deps: ProvisioningDeps,
): Promise<ProvisionResult> {
  const email = input.email.trim().toLowerCase();
  if (!z.email().safeParse(email).success) {
    throw new ProvisioningError("invalid_email", "That is not a valid email address.");
  }
  const name = input.name.trim();
  if (name.length < 2 || name.length > 100) {
    throw new ProvisioningError("invalid_name", "Name must be 2 to 100 characters.");
  }
  if (getAdminAllowlist().length === 0) {
    throw new ProvisioningError(
      "not_allowlisted",
      "ADMIN_EMAILS is empty. Add the address to ADMIN_EMAILS first.",
    );
  }
  if (!isAllowlistedAdmin(email)) {
    throw new ProvisioningError("not_allowlisted", "This email is not listed in ADMIN_EMAILS.");
  }
  const problems = passwordProblems(input.password);
  if (problems.length > 0) {
    throw new ProvisioningError("weak_password", problems.join(" "));
  }

  const existing = await deps.findUserByEmail(email);
  if (existing) {
    if (!input.resetPassword) {
      throw new ProvisioningError(
        "already_exists",
        "An account with this email already exists. Re-run with --reset-password to reset it.",
      );
    }
    await deps.resetAdmin(existing.id, await deps.hashPassword(input.password));
    return { status: "reset", userId: existing.id };
  }
  if (input.resetPassword) {
    throw new ProvisioningError("not_found", "No account exists for this email to reset.");
  }

  try {
    const user = await deps.createUser({ email, password: input.password, name, role: ADMIN_ROLE });
    await deps.markEmailVerified(user.id);
    return { status: "created", userId: user.id };
  } catch (error) {
    if (error instanceof ProvisioningError) throw error;
    throw new ProvisioningError("failed", "Could not create the admin account.");
  }
}
