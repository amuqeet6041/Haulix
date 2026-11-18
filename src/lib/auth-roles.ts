import { createAccessControl } from "better-auth/plugins/access";

/**
 * Role-based access control shared by every signed-in area.
 *
 * Roles:
 * - "admin":   HAULIX staff. Manages leads. Cannot create users, change roles,
 *              impersonate or set passwords through the API: admin accounts are
 *              provisioned only by `npm run admin:create` for allowlisted emails.
 * - "carrier": reserved for the future Carrier Portal. No permissions yet.
 *
 * Permissions are checked in every protected handler and service (Step 2+),
 * never only in the proxy.
 */

export const statements = {
  // Better Auth admin plugin resources (subset kept on purpose).
  user: ["list", "get", "ban"],
  session: ["list", "revoke"],
  // HAULIX resources.
  lead: ["list", "read", "update-status"],
  leadNote: ["create", "update", "delete"],
} as const;

export const ac = createAccessControl(statements);

export const roles = {
  admin: ac.newRole({
    user: ["list", "get", "ban"],
    session: ["list", "revoke"],
    lead: ["list", "read", "update-status"],
    leadNote: ["create", "update", "delete"],
  }),
  carrier: ac.newRole({
    user: [],
    session: [],
    lead: [],
    leadNote: [],
  }),
};

export type AppRole = keyof typeof roles;

export const ADMIN_ROLE: AppRole = "admin";
/** Role for accounts created by any future self-service flow (Carrier Portal). */
export const DEFAULT_ROLE: AppRole = "carrier";
