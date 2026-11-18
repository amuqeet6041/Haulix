import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import { siteConfig } from "@/config/site";
import { isAllowlistedAdmin } from "@/lib/admin-allowlist";
import { AUTH_COOKIE_PREFIX } from "@/lib/auth-constants";
import { ac, ADMIN_ROLE, DEFAULT_ROLE, roles } from "@/lib/auth-roles";
import { logServerWarning } from "@/lib/log";
import { getPrisma } from "@/lib/prisma";

/**
 * Better Auth, self-hosted on our Neon database through Prisma. Server only.
 *
 * - Email and password only. Public sign-up is disabled: accounts are created
 *   by `npm run admin:create` (admins) or, later, the Carrier Portal.
 * - Two-factor (TOTP) is postponed. The twoFactor plugin is NOT loaded; its
 *   tables and the User.twoFactorEnabled column stay in the database, dormant,
 *   so it can be reintroduced later by adding `twoFactor()` back here and the
 *   check back to lib/admin-guard.ts.
 * - Roles and permissions from lib/auth-roles.ts via the admin plugin.
 * - The admin role is limited to allowlisted emails (ADMIN_EMAILS), enforced
 *   here when a user is created and whenever a session is created.
 *
 * Created lazily so importing this module never needs a database or secret
 * (the site still builds without them).
 */

const APP_NAME = "HAULIX Logistics";
const HOUR = 60 * 60;

type Database = Parameters<typeof betterAuth>[0]["database"];

export interface AuthDeps {
  database: Database;
  /** Looks up a user's role and email (for the admin allowlist session check). */
  findUserForSession: (userId: string) => Promise<{ role: string | null; email: string } | null>;
}

function prismaDeps(): AuthDeps {
  const prisma = getPrisma();
  return {
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    findUserForSession: (userId) =>
      prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } }),
  };
}

/** Builds the Better Auth instance. Exported for tests (in-memory adapter). */
export function createAuth({ database, findUserForSession }: AuthDeps = prismaDeps()) {
  const baseURL = process.env.BETTER_AUTH_URL?.trim() || siteConfig.url;

  return betterAuth({
    appName: APP_NAME,
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    database,
    trustedOrigins: Array.from(new Set([baseURL, siteConfig.url])),

    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 6,
      maxPasswordLength: 128,
    },

    session: {
      expiresIn: 12 * HOUR,
      updateAge: HOUR,
    },

    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 15 * 60, max: 5 },
      },
    },

    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    },

    databaseHooks: {
      user: {
        create: {
          // No account may be created with the admin role unless its email is allowlisted.
          before: async (user) => {
            if (user.role === ADMIN_ROLE && !isAllowlistedAdmin(user.email)) {
              logServerWarning("auth", "Blocked creating an admin that is not allowlisted.");
              return false;
            }
          },
        },
      },
      session: {
        create: {
          // Refuse to sign in an admin who is no longer allowlisted.
          before: async (session) => {
            const user = await findUserForSession(session.userId);
            if (user?.role === ADMIN_ROLE && !isAllowlistedAdmin(user.email)) {
              logServerWarning(
                "auth",
                `Blocked sign-in for non-allowlisted admin ${session.userId}.`,
              );
              return false;
            }
          },
        },
      },
    },

    plugins: [
      admin({
        ac,
        roles,
        defaultRole: DEFAULT_ROLE,
        adminRoles: [ADMIN_ROLE],
      }),
      // Keep last: lets server actions set auth cookies.
      nextCookies(),
    ],
  });
}

let cachedAuth: ReturnType<typeof createAuth> | undefined;

/** The Better Auth instance. Throws if DATABASE_URL is missing. */
export function getAuth() {
  cachedAuth ??= createAuth();
  return cachedAuth;
}

/** True when sign-in can work: a database and a secret are configured. */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim() && process.env.BETTER_AUTH_SECRET?.trim());
}
