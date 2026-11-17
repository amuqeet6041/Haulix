import path from "node:path";

import { config, type DotenvPopulateInput } from "dotenv";

/**
 * Environment files the Prisma CLI reads, highest priority first. This mirrors
 * Next.js, where `.env.local` overrides `.env`. Variables already set in the
 * real environment (CI, Vercel, a shell export) always win: dotenv never
 * overrides them.
 */
export const PRISMA_ENV_FILES = [".env.local", ".env"] as const;

/** Loads the env files above into `processEnv` (default: `process.env`). */
export function loadPrismaEnv(
  options: { cwd?: string; processEnv?: DotenvPopulateInput } = {},
): void {
  const cwd = options.cwd ?? process.cwd();
  config({
    path: PRISMA_ENV_FILES.map((file) => path.join(cwd, file)),
    processEnv: options.processEnv ?? (process.env as DotenvPopulateInput),
    quiet: true,
  });
}

/**
 * URL used by Prisma CLI commands (migrate, studio, introspection).
 * Prefers the direct connection, then the pooled one. Returns undefined when
 * neither is set, so those commands fail with a clear "datasource url" error
 * instead of silently targeting a placeholder database.
 */
export function resolveDatasourceUrl(env: Record<string, string | undefined>): string | undefined {
  const url = env.DIRECT_URL?.trim() || env.DATABASE_URL?.trim();
  return url || undefined;
}
