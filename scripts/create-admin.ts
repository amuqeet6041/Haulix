/**
 * Creates (or resets) a HAULIX admin account. The only way to create an admin.
 *
 *   npm run admin:create -- --email you@haulixlogistics.com --name "Your Name"
 *   npm run admin:create -- --email you@haulixlogistics.com --reset-password
 *
 * Requirements: DATABASE_URL, BETTER_AUTH_SECRET and ADMIN_EMAILS (containing
 * the email) in .env.local, and the add_admin_auth migration applied.
 * The password is typed at a hidden prompt (or read from ADMIN_PASSWORD for
 * non-interactive use). It is never printed or logged.
 */
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";

import { loadPrismaEnv } from "../prisma/env";

loadPrismaEnv();

function readHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as {
      _writeToOutput: (text: string) => void;
      output: NodeJS.WriteStream;
    };
    let prompted = false;
    output._writeToOutput = (text: string) => {
      if (!prompted) {
        output.output.write(text);
        prompted = true;
      }
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      "reset-password": { type: "boolean", default: false },
    },
  });
  const email = values.email ?? "";
  const resetPassword = values["reset-password"] ?? false;
  const name = values.name ?? (resetPassword ? "unused" : "");
  if (!email || !name) {
    console.error(
      'Usage: npm run admin:create -- --email <email> --name "<name>" [--reset-password]',
    );
    process.exit(1);
  }

  // Imported after the env is loaded.
  const { getAuth } = await import("../src/lib/auth");
  const { getPrisma } = await import("../src/lib/prisma");
  const { provisionAdmin, ProvisioningError } = await import("../src/lib/admin-provisioning");
  const { ADMIN_ROLE } = await import("../src/lib/auth-roles");

  if (!process.env.BETTER_AUTH_SECRET?.trim()) {
    console.error("BETTER_AUTH_SECRET is not set. Add it to .env.local first.");
    process.exit(1);
  }

  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    password = await readHidden("Password: ");
    const confirm = await readHidden("Repeat password: ");
    if (password !== confirm) {
      console.error("Passwords do not match.");
      process.exit(1);
    }
  }

  const auth = getAuth();
  const prisma = getPrisma();
  try {
    const result = await provisionAdmin(
      { email, name, password, resetPassword },
      {
        createUser: async (input) => {
          const { user } = await auth.api.createUser({ body: input });
          return { id: user.id };
        },
        hashPassword: async (plain) => (await auth.$context).password.hash(plain),
        findUserByEmail: (address) =>
          prisma.user.findUnique({ where: { email: address }, select: { id: true, role: true } }),
        markEmailVerified: async (userId) => {
          await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
        },
        resetAdmin: async (userId, passwordHash) => {
          await prisma.$transaction([
            prisma.user.update({ where: { id: userId }, data: { role: ADMIN_ROLE } }),
            prisma.account.updateMany({
              where: { userId, providerId: "credential" },
              data: { password: passwordHash },
            }),
            prisma.session.deleteMany({ where: { userId } }),
          ]);
          const credential = await prisma.account.count({
            where: { userId, providerId: "credential" },
          });
          if (credential === 0) {
            await prisma.account.create({
              data: {
                id: crypto.randomUUID(),
                accountId: userId,
                providerId: "credential",
                userId,
                password: passwordHash,
              },
            });
          }
        },
      },
    );
    console.log(
      result.status === "created"
        ? `Admin account created for ${email.toLowerCase()}.`
        : `Password reset and admin role confirmed for ${email.toLowerCase()}. Existing sessions were signed out.`,
    );
    console.log("Next: sign in at /admin/login with this email and password.");
  } catch (error) {
    console.error(
      error instanceof ProvisioningError ? error.message : "Could not provision the admin account.",
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
