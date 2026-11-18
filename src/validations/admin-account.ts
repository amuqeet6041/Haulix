import { z } from "zod";

/**
 * Input rules for the admin account page. Pure Zod, so the same rules run in
 * the browser (for instant feedback) and on the server (the authority).
 *
 * The password limits mirror Better Auth's `emailAndPassword` configuration in
 * lib/auth.ts (6 to 128 characters); a test keeps them in step.
 */

export const ACCOUNT_PASSWORD_MIN = 6;
export const ACCOUNT_PASSWORD_MAX = 128;
export const ACCOUNT_NAME_MAX = 100;

/** Profile update. Only the display name can change; anything else is refused. */
export const accountProfileSchema = z.strictObject({
  name: z
    .string({ error: "Please enter your name." })
    .trim()
    .min(1, "Please enter your name.")
    .max(ACCOUNT_NAME_MAX, `Please keep your name under ${ACCOUNT_NAME_MAX} characters.`),
});

export type AccountProfileInput = z.output<typeof accountProfileSchema>;

/** The password change form. The confirmation is a typing check that never leaves the browser. */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Please enter your current password."),
    newPassword: z
      .string()
      .min(ACCOUNT_PASSWORD_MIN, `Use at least ${ACCOUNT_PASSWORD_MIN} characters.`)
      .max(ACCOUNT_PASSWORD_MAX, `Use at most ${ACCOUNT_PASSWORD_MAX} characters.`),
    confirmPassword: z.string().min(1, "Please repeat the new password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    error: "The two new passwords do not match.",
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ["newPassword"],
    error: "Choose a password that is different from your current one.",
  });

export type PasswordChangeInput = z.input<typeof passwordChangeSchema>;

/** Field name to first message, for showing under each field. */
export function firstErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

/** Better Auth session ids are opaque URL-safe strings. Anything else is not a session id. */
export const sessionIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid session id.");
