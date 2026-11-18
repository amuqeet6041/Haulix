// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

/**
 * A tripwire for the admin area's access control. It reads the source tree, so
 * a NEW admin route or page that forgets its guard fails here, and a new one
 * has to be added to the lists below on purpose (and so reviewed).
 *
 * This is a static check. The behavior itself (401, 403, 404, 409 ...) is
 * tested route by route with real Better Auth sessions in the route tests.
 */

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");

function walk(dir: string, match: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full, match);
    return match.test(name) ? [full] : [];
  });
}

const rel = (file: string) => path.relative(SRC, file).split(path.sep).join("/");
const read = (file: string) => readFileSync(file, "utf8");

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

const EXPECTED_ADMIN_ROUTES: Record<string, string[]> = {
  "app/api/admin/account/profile/route.ts": ["PATCH"],
  "app/api/admin/account/sessions/[id]/route.ts": ["DELETE"],
  "app/api/admin/account/sessions/route.ts": ["GET"],
  "app/api/admin/leads/[id]/notes/[noteId]/route.ts": ["DELETE", "PATCH"],
  "app/api/admin/leads/[id]/notes/route.ts": ["POST"],
  "app/api/admin/leads/[id]/route.ts": ["GET"],
  "app/api/admin/leads/[id]/status/route.ts": ["PATCH"],
  "app/api/admin/leads/route.ts": ["GET"],
  "app/api/admin/me/route.ts": ["GET"],
  "app/api/admin/stats/route.ts": ["GET"],
};

const adminRoutes = walk(path.join(SRC, "app/api/admin"), /^route\.ts$/);

describe("admin API routes", () => {
  it("are exactly the reviewed set (a new admin route must be added here on purpose)", () => {
    expect(adminRoutes.map(rel).sort()).toEqual(Object.keys(EXPECTED_ADMIN_ROUTES).sort());
  });

  it.each(Object.entries(EXPECTED_ADMIN_ROUTES))(
    "%s exports only guarded handlers (%j)",
    (file, methods) => {
      const source = read(path.join(SRC, file));
      const exported = [
        ...source.matchAll(
          /export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g,
        ),
      ].map((match) => match[1]!);
      expect(exported.sort()).toEqual([...methods].sort());
      for (const method of methods) {
        // Every handler is wrapped in withAdmin: authentication, role, allowlist,
        // permission, same-origin check for writes, no-store headers, safe errors.
        expect(source).toMatch(new RegExp(`export const ${method} = withAdmin`));
      }
      // No handler may reach the database or a service without going through withAdmin.
      expect(source).not.toMatch(/export (async )?function (GET|POST|PUT|PATCH|DELETE)/);
    },
  );

  it("every route that changes data names a permission or is an own-account route", () => {
    for (const [file, methods] of Object.entries(EXPECTED_ADMIN_ROUTES)) {
      if (methods.every((method) => method === "GET")) continue;
      const source = read(path.join(SRC, file));
      const ownAccount = file.startsWith("app/api/admin/account/");
      if (ownAccount) {
        // Own-account routes take the user from the verified session, never from the request.
        expect(source).toMatch(/withAdmin[^(]*\(\s*\{\}/);
        expect(source).not.toMatch(/userId/);
      } else {
        expect(source).toMatch(/withAdmin[^(]*\(\s*\{\s*(lead|leadNote):/);
      }
    }
  });

  it("no admin route reads a user id, role or author from the request body or URL", () => {
    for (const route of adminRoutes) {
      const source = read(route);
      expect(source).not.toMatch(/body\.(data\.)?(userId|authorId|actorId|role)\b/);
      expect(source).not.toMatch(/searchParams\.get\(["'](userId|authorId|actorId|role)["']\)/);
    }
  });

  it("no route or service uses raw SQL", () => {
    const files = walk(path.join(SRC, "services"), /\.ts$/).concat(
      walk(path.join(SRC, "app"), /\.(ts|tsx)$/),
    );
    for (const file of files) {
      expect(read(file), rel(file)).not.toMatch(/\$(query|execute)Raw/);
    }
  });
});

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

const protectedDir = path.join(SRC, "app/admin/(protected)");
const protectedPages = walk(protectedDir, /^page\.tsx$/)
  .map(rel)
  .sort();

describe("protected admin pages", () => {
  it("are exactly the reviewed set", () => {
    expect(protectedPages).toEqual(
      [
        "app/admin/(protected)/account/page.tsx",
        "app/admin/(protected)/leads/[id]/page.tsx",
        "app/admin/(protected)/leads/page.tsx",
        "app/admin/(protected)/page.tsx",
      ].sort(),
    );
  });

  it.each(protectedPages)(
    "%s checks admin access and passes only that verified admin on",
    (file) => {
      const source = read(path.join(SRC, file));
      // The admin context comes from the guard, which redirects anyone not allowed.
      expect(source).toMatch(/const admin = await requireAdminPage\(\)/);
      // Every data call is handed that verified context (and the service checks it again).
      for (const name of [
        "getLead",
        "listLeads",
        "getDashboardStats",
        "getAccountProfile",
        "listAccountSessions",
      ]) {
        for (const match of source.matchAll(new RegExp(`await ${name}\\(([^,)]*)`, "g"))) {
          expect(match[1]!.trim(), `${file} ${name}`).toBe("admin");
        }
      }
      // Nothing is read from the URL to decide whose data to show.
      expect(source).not.toMatch(/params\)?\.(userId|authorId)/);
    },
  );

  it("the protected layout checks access and only the login page lives outside it", () => {
    expect(read(path.join(protectedDir, "layout.tsx"))).toMatch(/await requireAdminPage\(\)/);
    const outside = walk(path.join(SRC, "app/admin"), /^page\.tsx$/)
      .filter((file) => !file.includes("(protected)"))
      .map(rel);
    expect(outside).toEqual(["app/admin/login/page.tsx"]);
  });

  it("no page, layout or component outside the protected group imports admin services", () => {
    const publicFiles = walk(path.join(SRC, "app"), /\.(ts|tsx)$/).filter(
      (file) =>
        !file.includes("(protected)") &&
        !file.includes(`${path.sep}api${path.sep}admin`) &&
        !file.includes(`${path.sep}admin${path.sep}`),
    );
    for (const file of publicFiles) {
      expect(read(file), rel(file)).not.toMatch(/admin-(lead|note|account)\.service/);
    }
  });
});

// ---------------------------------------------------------------------------
// Services, proxy, headers
// ---------------------------------------------------------------------------

describe("admin services", () => {
  const services = walk(path.join(SRC, "services"), /^admin-.*\.service\.ts$/);

  it("every exported service function authorizes first", () => {
    expect(services.map(rel).sort()).toEqual([
      "services/admin-account.service.ts",
      "services/admin-lead.service.ts",
      "services/admin-note.service.ts",
    ]);
    for (const file of services) {
      const source = read(file);
      const functions = [...source.matchAll(/export async function (\w+)\(\s*admin: unknown/g)];
      expect(functions.length, rel(file)).toBeGreaterThan(0);
      for (const match of functions) {
        const body = source.slice(match.index!, match.index! + 700);
        expect(body, `${rel(file)} ${match[1]}`).toMatch(/assertAdmin\(admin/);
      }
    }
  });

  it("every service function takes the admin as its first argument, never a user id", () => {
    for (const file of services) {
      expect(read(file)).not.toMatch(/export async function \w+\(\s*userId/);
    }
  });
});

describe("proxy and headers", () => {
  it("the proxy covers the admin pages and the admin API", () => {
    const source = read(path.join(SRC, "proxy.ts"));
    expect(source).toContain('"/admin"');
    expect(source).toContain('"/admin/:path*"');
    expect(source).toContain('"/api/admin/:path*"');
  });

  it("the admin area forbids framing, hides referrers and is never cached or indexed", async () => {
    const rules = await nextConfig.headers!();
    const bySource = Object.fromEntries(rules.map((rule) => [rule.source, rule.headers]));
    expect(Object.keys(bySource).sort()).toEqual(["/admin/:path*", "/api/admin/:path*"]);

    for (const headers of Object.values(bySource)) {
      const map = Object.fromEntries(headers.map((h) => [h.key, h.value]));
      expect(map["Content-Security-Policy"]).toBe("frame-ancestors 'none'");
      expect(map["X-Frame-Options"]).toBe("DENY");
      expect(map["Referrer-Policy"]).toBe("no-referrer");
      expect(map["X-Content-Type-Options"]).toBe("nosniff");
      expect(map["Cache-Control"]).toContain("no-store");
      expect(map["X-Robots-Tag"]).toContain("noindex");
    }
  });

  it("the public site is not given the admin-only headers", async () => {
    const rules = await nextConfig.headers!();
    for (const rule of rules)
      expect(rule.source.startsWith("/admin") || rule.source.startsWith("/api/admin")).toBe(true);
  });
});

describe("dependencies", () => {
  it("package.json has not gained any dependency beyond the reviewed set", () => {
    const pkg = JSON.parse(read(path.join(ROOT, "package.json"))) as {
      dependencies: Record<string, string>;
    };
    // better-auth is pinned; everything else is a caret range chosen earlier.
    expect(pkg.dependencies["better-auth"]).toBe("1.7.16");
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      "@hookform/resolvers",
      "@prisma/adapter-pg",
      "@prisma/client",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-slot",
      "better-auth",
      "class-variance-authority",
      "clsx",
      "framer-motion",
      "geist",
      "lucide-react",
      "next",
      "pg",
      "react",
      "react-dom",
      "react-hook-form",
      "resend",
      "tailwind-merge",
      "zod",
    ]);
  });
});
