import { defineConfig } from "prisma/config";

import { loadPrismaEnv, resolveDatasourceUrl } from "./prisma/env";

// The Prisma CLI does not load env files itself. Read `.env.local`, then `.env`.
loadPrismaEnv();

const url = resolveDatasourceUrl(process.env);

/**
 * Prisma 7 reads connection URLs from this file instead of schema.prisma.
 * The datasource is only set when a URL exists: `prisma generate` (run on
 * install) does not need one, while `migrate` and `studio` fail loudly
 * without one rather than falling back to a placeholder database.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(url ? { datasource: { url } } : {}),
});
