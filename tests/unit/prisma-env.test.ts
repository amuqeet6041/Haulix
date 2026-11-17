// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadPrismaEnv, PRISMA_ENV_FILES, resolveDatasourceUrl } from "../../prisma/env";

describe("resolveDatasourceUrl", () => {
  it("prefers DIRECT_URL over DATABASE_URL", () => {
    expect(
      resolveDatasourceUrl({
        DIRECT_URL: "postgresql://direct",
        DATABASE_URL: "postgresql://pool",
      }),
    ).toBe("postgresql://direct");
  });

  it("falls back to DATABASE_URL", () => {
    expect(resolveDatasourceUrl({ DATABASE_URL: "postgresql://pool" })).toBe("postgresql://pool");
  });

  it("returns undefined instead of a placeholder when nothing is set", () => {
    expect(resolveDatasourceUrl({})).toBeUndefined();
    expect(resolveDatasourceUrl({ DIRECT_URL: "  ", DATABASE_URL: "" })).toBeUndefined();
  });
});

describe("loadPrismaEnv", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "haulix-prisma-env-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("reads .env.local before .env, like Next.js", () => {
    expect(PRISMA_ENV_FILES).toEqual([".env.local", ".env"]);
    writeFileSync(path.join(dir, ".env.local"), "DATABASE_URL=postgresql://from-local\n");
    writeFileSync(
      path.join(dir, ".env"),
      "DATABASE_URL=postgresql://from-env\nDIRECT_URL=postgresql://direct-from-env\n",
    );

    const env: Record<string, string> = {};
    loadPrismaEnv({ cwd: dir, processEnv: env });

    expect(env.DATABASE_URL).toBe("postgresql://from-local");
    expect(env.DIRECT_URL).toBe("postgresql://direct-from-env");
  });

  it("never overrides variables already set in the real environment", () => {
    writeFileSync(path.join(dir, ".env.local"), "DATABASE_URL=postgresql://from-local\n");

    const env: Record<string, string> = { DATABASE_URL: "postgresql://from-platform" };
    loadPrismaEnv({ cwd: dir, processEnv: env });

    expect(env.DATABASE_URL).toBe("postgresql://from-platform");
  });

  it("works when no env files exist", () => {
    const env: Record<string, string> = {};
    expect(() => loadPrismaEnv({ cwd: dir, processEnv: env })).not.toThrow();
    expect(resolveDatasourceUrl(env)).toBeUndefined();
  });
});
