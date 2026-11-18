/**
 * Fills the DEV database with fake leads for admin panel work.
 *
 *   npm run db:seed-dev            adds 40 fake leads (skips ones already there)
 *   npm run db:seed-dev -- --reset removes every seed lead (and its notes/activity)
 *   npm run db:seed-dev -- --count 60
 *
 * Refuses to run against the production Neon endpoint, in production, or on
 * Vercel (see seedTargetProblem in src/lib/dev-seed.ts). Sends no emails: it
 * writes rows directly and marks them as already notified.
 */
import { parseArgs } from "node:util";

import { loadPrismaEnv } from "../prisma/env";

loadPrismaEnv();

async function main() {
  const { values } = parseArgs({
    options: {
      reset: { type: "boolean", default: false },
      count: { type: "string" },
    },
  });

  const { buildSeedLeads, DEFAULT_SEED_COUNT, SEED_PREFIX, seedTargetProblem } =
    await import("../src/lib/dev-seed");

  const problem = seedTargetProblem(process.env.DATABASE_URL);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }

  const count = values.count === undefined ? DEFAULT_SEED_COUNT : Number(values.count);
  if (!Number.isInteger(count) || count < 1 || count > 500) {
    console.error("--count must be a whole number from 1 to 500.");
    process.exit(1);
  }

  const { getPrisma } = await import("../src/lib/prisma");
  const prisma = getPrisma();
  try {
    if (values.reset) {
      const { count: removed } = await prisma.lead.deleteMany({
        where: { submissionId: { startsWith: SEED_PREFIX } },
      });
      console.log(`Removed ${removed} seed lead(s).`);
      return;
    }

    const leads = buildSeedLeads(count);
    const { count: added } = await prisma.lead.createMany({
      data: leads.map((lead) => ({
        ...lead,
        updatedAt: lead.contactedAt ?? lead.createdAt,
        notifiedAt: lead.createdAt,
        confirmationSentAt: lead.createdAt,
      })),
      skipDuplicates: true,
    });
    const total = await prisma.lead.count({ where: { submissionId: { startsWith: SEED_PREFIX } } });
    console.log(`Added ${added} seed lead(s). Seed leads in this database: ${total}.`);
  } catch {
    console.error("Seeding failed. Check that the dev database is reachable and migrated.");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
