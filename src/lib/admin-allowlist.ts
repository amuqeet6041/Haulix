/**
 * Emails allowed to hold the admin role, from ADMIN_EMAILS (comma separated,
 * case-insensitive). Empty means nobody can be an admin. Checked when an admin
 * account is provisioned, whenever a user would gain the admin role (database
 * hook in lib/auth.ts), and again on every admin request (Step 2).
 */
export function getAdminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowlistedAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminAllowlist().includes(email.trim().toLowerCase());
}
