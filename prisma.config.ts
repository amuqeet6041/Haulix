import "dotenv/config";

import { defineConfig } from "prisma/config";

/**
 * Prisma 7 reads connection URLs from this file instead of schema.prisma.
 * The fallback keeps `prisma generate` working without a database, so a fresh
 * clone can install and build without PostgreSQL.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url:
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL ||
      "postgresql://placeholder:placeholder@localhost:5432/haulix",
  },
});
