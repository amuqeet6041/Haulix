import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Data access layer entry point.
 *
 * The client is created lazily, the first time `getPrisma()` is called, so
 * importing this file never opens a database connection. The public website
 * therefore builds and runs without PostgreSQL.
 *
 * `src/generated/prisma` is produced by `npm run db:generate` (it also runs
 * automatically after `npm install`).
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local to enable lead storage.");
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }
  return globalForPrisma.prisma;
}
