# HAULIX — Public Website (Module 1)

Marketing website for **HAULIX**, an American truck dispatching company. The goal of this module is
carrier acquisition: visitors learn about the services, review pricing, and submit a carrier
inquiry that reaches the HAULIX team.

> **Two modules.** This repository is **Module 1 (Public Website)** only. **Module 2 (Carrier
> Portal)** is a future project. `/portal` is reserved for it and nothing of Module 2 is built yet.

## Status

- All 13 routes exist and render (`/`, `/about`, `/services`, `/services/[equipment]`, `/pricing`,
  `/how-it-works`, `/contact`, `/faq`, `/resources`, `/blog`, `/get-started`, `/privacy-policy`,
  `/terms`) plus the reserved `/portal` placeholder.
- Page copy is **placeholder text** marked in `src/content/`. No statistics, testimonials,
  customer logos, certifications or prices have been invented. Replace the copy before launch.
- Contact details, social links and photography are intentionally empty until real ones exist.

## Technology stack

| Area       | Technology                                                                        |
| ---------- | --------------------------------------------------------------------------------- |
| Framework  | Next.js 16.4.6 (App Router), React 19.3.1                                         |
| Language   | TypeScript 6.0.3 (strict mode, `noUncheckedIndexedAccess`)                        |
| Styling    | Tailwind CSS 4.3.5, CSS-variable design tokens, shadcn/ui-style components        |
| UI         | Radix UI primitives, lucide-react 1.73.0, Framer Motion 14.14.0, Geist font 1.9.2 |
| Forms      | React Hook Form 7.92.0, Zod 4.6.7, @hookform/resolvers 7.0.6                      |
| Database   | PostgreSQL via Prisma 7.10.1 (`@prisma/adapter-pg`, `pg`)                         |
| Email      | Resend 6.38.1                                                                     |
| Testing    | Vitest 5.1.0, React Testing Library 16.3.3, Playwright 1.65.1                     |
| Quality    | ESLint 9.39.5 (`eslint-config-next` 16.4.6), Prettier 3.10.1                      |
| Deployment | Vercel + GitHub                                                                   |

Built and verified with Node.js v22.23.4 and npm 10.9.9.

## Prerequisites

- Node.js **20.9 or newer** (22 LTS recommended) and npm
- Git
- (Optional) A PostgreSQL database and a Resend account. **Neither is needed to run the site.**

## Installation

```bash
npm install
cp .env.example .env.local   # then edit values as needed
npm run dev
```

Open <http://localhost:3000>.

`npm install` runs `prisma generate` (via `postinstall`) which creates the Prisma client in
`src/generated/prisma`. This needs internet access the first time (Prisma downloads its engines).
No database connection is required for this step.

## Commands

| Command                | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start the dev server                           |
| `npm run build`        | Production build                               |
| `npm run start`        | Serve the production build                     |
| `npm run typecheck`    | TypeScript check (`tsc --noEmit`)              |
| `npm run lint`         | ESLint                                         |
| `npm run format`       | Format with Prettier                           |
| `npm run format:check` | Check formatting                               |
| `npm run test`         | Unit and component tests (Vitest)              |
| `npm run test:e2e`     | End-to-end tests (Playwright)                  |
| `npm run check`        | Typecheck + lint + format check + unit tests   |
| `npm run db:generate`  | Regenerate the Prisma client                   |
| `npm run db:migrate`   | Create/apply a database migration (needs a DB) |

First-time Playwright setup: `npx playwright install chromium`.

## Environment configuration

Copy `.env.example` to `.env.local`. Every variable is documented in that file.

| Variable                          | Needed to run? | Purpose                                            |
| --------------------------------- | -------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`            | No             | Canonical/sitemap base URL. Defaults to localhost. |
| `DATABASE_URL`, `DIRECT_URL`      | No             | PostgreSQL connection (lead storage)               |
| `RESEND_API_KEY`, `CONTACT_EMAIL` | No             | Email notifications for new leads/messages         |
| `EMAIL_FROM`                      | No             | Verified sender address for Resend                 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`   | No             | Reserved for analytics (not wired up yet)          |
| `SENTRY_DSN`                      | No             | Reserved for error monitoring (not wired up yet)   |

Only `NEXT_PUBLIC_*` variables reach the browser. Keep secrets out of those.

**Forms without configuration:** the database is the source of truth. Until `DATABASE_URL` is
set, the lead and contact APIs return a clear "not available yet" (HTTP 503) instead of pretending
to succeed, even if email is configured. A submission succeeds only once it is stored. The team
notification is sent afterwards and needs **both** `RESEND_API_KEY` and `CONTACT_EMAIL`; if email
is missing or fails, the stored submission is kept and a warning naming the record id (never
personal data) is logged.

**Prisma CLI and env files:** `prisma.config.ts` loads `.env.local` first, then `.env` (the same
precedence as Next.js); variables already set in the real environment always win. If neither
`DIRECT_URL` nor `DATABASE_URL` is set, `prisma generate` still works, while `migrate` and `studio`
stop with a "datasource url" error instead of using a placeholder database.

To create the tables once you have a database:

```bash
npx prisma migrate dev --name init
```

## Folder structure

```
Hailix/
├── prisma/schema.prisma        Data model (unified Lead, NewsletterSubscriber)
├── prisma.config.ts            Prisma 7 connection config
├── public/                     Static assets (images, logos, icons, fonts) + READMEs
├── src/
│   ├── app/                    Routes
│   │   ├── (marketing)/        Public pages sharing navbar + footer
│   │   ├── portal/             Reserved for Module 2 (placeholder + README)
│   │   ├── api/                leads, contact, newsletter route handlers
│   │   ├── layout.tsx, globals.css, error.tsx, loading.tsx, not-found.tsx
│   │   └── robots.ts, sitemap.ts, icon.svg
│   ├── components/
│   │   ├── ui/                 Low-level primitives (button, input, accordion, sheet, ...)
│   │   ├── layout/             Navbar, Footer
│   │   ├── shared/             Reusable building blocks (SectionHeading, CtaSection, ...)
│   │   ├── home/, services/, pricing/, forms/
│   ├── config/                 site.ts, navigation.ts, metadata.ts
│   ├── content/                services, faqs, pricing, testimonials, process (editable copy)
│   ├── hooks/                  use-post-json.ts
│   ├── lib/                    utils, seo, prisma, api-response, email/, validations/
│   ├── services/               lead, contact, newsletter, email (business logic)
│   ├── types/                  Shared types
│   └── validations/            Zod schemas (lead, contact, newsletter)
├── tests/unit/                 Vitest tests
├── tests/e2e/                  Playwright tests
├── ARCHITECTURE.md
└── .env.example
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the layers fit together.

## Deployment (Vercel + GitHub)

1. Push this project to a GitHub repository (`.env*` files are git-ignored).
2. In Vercel choose **Add New → Project** and import the repository. Framework preset: Next.js.
3. Add environment variables under **Settings → Environment Variables** (at minimum
   `NEXT_PUBLIC_SITE_URL` once the domain is decided; plus database/email variables when ready).
4. Deploy. Vercel runs `npm install` (which generates the Prisma client) and `npm run build`.
5. Run migrations against the production database from your machine:
   `DIRECT_URL=... npx prisma migrate deploy`.

## Before launch checklist

- Replace placeholder copy in `src/content/` and the About, Privacy Policy and Terms pages.
- Fill `siteConfig.contact` and `siteConfig.social` in `src/config/site.ts`.
- Add real photography to `public/images/` and the final logo to `public/logos/`.
- Set `NEXT_PUBLIC_SITE_URL`, database and email variables.
- Add rate limiting to the API routes (see ARCHITECTURE.md).
- Add an Open Graph image.
