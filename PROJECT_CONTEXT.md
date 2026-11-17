# HAULIX — Project Context

> **Purpose of this file.** A complete, verified snapshot of the HAULIX repository so that a new
> developer or AI coding assistant can continue work without repeating the initial investigation.
> Everything below was checked against the actual source code on **2026-11-17** (commit `7ae1d55`,
> "Initial Commit", branch `main`, clean working tree). Where the existing `README.md` or
> `ARCHITECTURE.md` say something, it was verified in code; discrepancies are called out.
>
> No secret values appear in this document.

---

## 0. Update — Phase 1 landing page (2026-11-17, uncommitted)

This supersedes the design-system notes in §8–§9 where they conflict.

- **Brand:** HAULIX Logistics. Dark-first site. Palette tokens in `globals.css`: `ink #141414`,
  `ink-warm #1D1614`, `brown #2E1B12`, `orange #E86416`, `orange-soft #D98855`, `cream #F3F0EB`,
  `gray #D5D5D5`. Tailwind `white`/`black` are remapped to cream/ink. Old `navy-*`/`brand-*`
  classes were renamed (only `brand-600` survives as an alias for the untouched `/portal` page).
  Orange buttons use dark text (`primary-foreground` = ink) for AA contrast.
- **Fonts:** Manrope (headings, `font-display`) + Inter (body) via `next/font/google`. Geist is no
  longer imported (the `geist` package is now an unused dependency).
- **Assets:** `public/logos/haulix-logo.png` (transparent speedmark used by `Logo`),
  `public/images/hero/truck-night-trails.jpg`, `public/images/general/truck-sunset-highway.jpg`.
- **Landing:** `/` is a single page built from `src/components/home/*-section.tsx`; copy in
  `src/content/landing.ts`. Nav items are anchors (`/#about`, `/#services`, `/#how-it-works`,
  `/#contact`) defined by `landingSectionIds` in `config/navigation.ts`; navbar is sticky,
  transparent at top, with a scroll-spy. "Carrier Login" was removed from the navbar
  (`siteConfig.portal` unchanged). Testimonials show an honest placeholder while empty.
- `Reveal` now always renders `motion.div` with `MotionConfig reducedMotion="user"` (the old
  reduced-motion branch caused a hydration mismatch that left content invisible).
- Verified: `npm run check` (23 tests) and `npm run build` pass; screenshots at 1440/820/390 px
  show no horizontal overflow.

## 0b. Update — Phase 2 design system (2026-11-17, uncommitted)

- **Tokens** (`globals.css`): card/input surfaces (`bg-card`, `border-card-border`, `bg-input`,
  `border-input-border`), named radii (`rounded-panel` 1.75rem, `rounded-media` 2rem,
  `rounded-banner` 2.5rem), motion (`--duration-*`, `ease-out-soft`), layout vars, breakpoints
  declared explicitly (Tailwind defaults). Recipes as `@utility`: `section-y`, `section-b`,
  `label-caps`, `heading-section`, `card-surface`, `card-interactive`. Do not name custom utilities
  `text-*`: tailwind-merge treats them as colors and drops classes.
- **Button** variants: `primary` (orange, dark text), `secondary` (glass), `outline` (navbar CTA),
  `onDark` (deprecated alias of secondary), `ghost`, `link`; sizes `sm/md/lg/xl/icon` (`xl` = hero CTA).
  Wrappers `PrimaryButton`/`SecondaryButton`/`OutlineButton` share `shared/action-button.tsx`.
- **New:** `shared/arrow-link.tsx`, `shared/back-to-top.tsx` (in marketing layout),
  `layout/mobile-menu.tsx`, `layout/nav-utils.ts`, `hooks/use-scrolled-past.ts`.
- `CtaSection` is now the Phase 1 banner (optional image, eyebrow, children); `FinalCtaSection`
  is a thin wrapper over it. `ServiceCard` is the dark card with optional `category` chip and is
  reused by the landing equipment grid. `FeatureCard`, `TrustBadge`, `TestimonialCard` and form
  fields use the card/input tokens.
- Verified: `npm run check` (33 tests), `npm run build`, screenshots at 1440/820/390 with no overflow.

## 0c. Update — Phase 3 public pages (2026-11-17, uncommitted)

- **Pages built out:** `/about`, `/services`, `/how-it-works`, `/pricing`, `/contact`; **new** `/equipment`
  (`(marketing)/equipment/page.tsx`). Homepage unchanged. `/portal` untouched.
- **Content** lives in `src/content/{about,dispatch-services,how-it-works,equipment-page,contact}.ts`
  and a rewritten `content/pricing.ts`. `/services` now lists the six dispatch services
  (`dispatchServices`); the seven equipment types moved to `/equipment` (grouped by
  `equipmentCategories`). `/services/[slug]` detail pages still exist; their breadcrumb is now
  Home > Equipment > X.
- **Pricing** is request-a-quote only: three quote profiles (Single truck, Small fleet, Larger fleet)
  with "Quote on request", no amounts, percentages or guarantees. A unit test enforces this.
- **Navigation:** `mainNav` now links to pages (Home, About, Services, How It Works, Equipment,
  Pricing, Contact) instead of landing anchors, so the homepage scroll-spy is inert.
  `landingSectionIds` still drives homepage section ids. Footer columns updated; sitemap has `/equipment`.
- `PricingCard` gained `ctaLabel` and `plan.featuresLabel`, uses `card-surface`. New
  `services/dispatch-service-icon.tsx`. FAQ answers for equipment and pricing updated to match.
- **Copy rules:** no em/en dashes or slashes in visible copy (unit test scans the Phase 3 content).
- Contact form unchanged (still 503 "not available yet" until DB or Resend is configured).
  Contact details render on `/contact` only when `siteConfig.contact` values are set.
- Verified: `npm run check` (53 tests), `npm run build` (29 static pages), screenshots at
  1440/1024/390 with no horizontal overflow. Playwright e2e smoke tests added for the six routes but
  not run (bundled Chromium is not installed; screenshots used installed Edge via `channel: "msedge"`).

## 0d. Update — Phase 4.2 backend fixes (2026-11-17, uncommitted)

Supersedes §6 "Data flow", §12 and K1/K2/K4/K5 in §16 where they conflict.

- **Approved Phase 4 direction (not built yet):** one shared Lead table for carrier inquiries and
  contact messages, Neon PostgreSQL, Prisma 7, Resend, Zod 4, Cloudflare Turnstile behind a feature
  flag, existing Route Handlers. `/portal` untouched.
- **K1 fixed:** `prisma.config.ts` loads `.env.local` then `.env` via `prisma/env.ts` (real env vars
  win). No placeholder URL any more: without `DIRECT_URL`/`DATABASE_URL` the datasource is omitted,
  so `prisma generate` works and `migrate`/`studio` fail clearly.
- **K2 fixed:** `getMissingEmailConfig()` / `isEmailConfigured()` in `lib/email/client.ts` check
  `RESEND_API_KEY` and `CONTACT_EMAIL` together (blank values count as missing).
- **Store-first submissions:** `submitLead` / `submitContactMessage` return `not_configured` (503)
  without a database, `failed` (500) if the write fails (no email sent), and `ok` once stored. The
  notification is sent after storing; a skipped or failed email is logged with the record id only.
  Configuring Resend alone no longer makes forms work.
- **Logging:** `lib/log.ts` (`describeError`, `logServerError`, `logServerWarning`) logs error name
  and code only, never provider messages or submitted values.
- **Forms (K4/K5 fixed):** `usePostJson.submit()` returns `{ ok }` or `{ ok: false, fieldErrors }`;
  `pickFieldErrors` (`lib/form-errors.ts`) maps 422 errors onto fields and focuses the first.
  Non-JSON responses show a server error message. `aria-invalid`/`aria-describedby` added to contact
  phone and lead company, lanes and message. No visual changes.
- **Tests:** new `prisma-env`, `email-config`, `services`, `api-routes`, `forms` unit tests.
- Still open: no database or Resend configured, no migrations, no rate limiting or CAPTCHA (K8).

## 0e. Update — Phase 4.3 unified Lead schema (2026-11-17, uncommitted)

Supersedes §11 (database), §12 (validation rules) and the folder notes for `contact.ts` /
`contact.service.ts` where they conflict. Full field table: `ARCHITECTURE.md` §6.

- **Schema:** `ContactMessage` removed. One `Lead` model with `type` (`LeadType`:
  `CARRIER_INQUIRY`, `CONTACT`), `status` (`LeadStatus`: `NEW` default, `CONTACTED`, `QUALIFIED`,
  `ONBOARDED`, `REJECTED`, new `SPAM`), new `InquiryType` enum (`GENERAL`, `DISPATCH_SERVICES`,
  `PRICING`, `EQUIPMENT`, `PARTNERSHIP`, `OTHER`). `truckCount` renamed `fleetSize` (nullable);
  `phone`, `equipment` now nullable. New: `inquiryType`, `subject`, `sourcePage`, `submissionId`
  (`@unique @default(cuid())`), `ipHash`, `userAgent`, `notifiedAt`, `confirmationSentAt`, `notes`,
  `contactedAt`. VarChar lengths match `leadLimits`. Indexes `(status, createdAt)`,
  `(type, createdAt)`, `email`, `(ipHash, createdAt)`. `NewsletterSubscriber` unchanged.
  **Still no migration** (Phase 4.4 creates the first one against Neon).
- **Zod** (`src/validations/lead.ts`; `contact.ts` removed): `carrierInquirySchema` (was
  `leadSchema`) and `contactSchema` share name/email/company/honeypot rules. Contact now requires
  `inquiryType`; `subject` became optional; contact phone, if given, must be a valid US number
  (was free text); contact `equipment`/`fleetSize` optional. Unknown keys are stripped, so clients
  cannot set `type` or any server-managed field. Inquiry labels: `src/content/inquiry-types.ts`.
- **Services:** `contact.service.ts` merged into `lead.service.ts` (`submitCarrierInquiry`,
  `submitContactMessage`, pure `toCarrierInquiryRecord` / `toContactRecord`).
- **Form compatibility (no visual redesign):** ContactForm sends `inquiryType: "GENERAL"` by
  default until a topic picker is added; its Subject label lost the required asterisk. LeadForm's
  truck count field is registered as `fleetSize` (id `fleetSize`, label unchanged).
- Tests: 118 passing (validation per type, enum sync with Prisma, server-managed field stripping).

## 0h. Update — Phase 4.6 Resend email integration (2026-11-18, uncommitted)

Supersedes the email notes in §4, §12, §13 and §18 where they conflict. Details: `ARCHITECTURE.md`
§6 data flow and §7 "Email".

- **Env:** `RESEND_API_KEY`, `FROM_EMAIL` (new name; `EMAIL_FROM` still read as fallback; the old
  `onboarding@resend.dev` default was removed), `CONTACT_EMAIL`. Notifications need all three;
  confirmations need the key and sender. As of this phase none of them is set in `.env.local`, so
  no email is sent yet; leads are still stored.
- **Flow:** store lead → `after()` → team notification + visitor confirmation in parallel →
  `notifiedAt` / `confirmationSentAt` set only on Resend success. Duplicates schedule nothing.
- **Templates:** branded dark HTML + plain text (`lib/email/templates.ts`). Times shown in UTC
  (no business time zone documented). Footer shows the site URL only when `NEXT_PUBLIC_SITE_URL`
  is a real domain, and phone or email only when `siteConfig.contact` has them (currently empty).
- **Manual setup still needed:** Resend account and API key, a verified sending domain (DNS
  records from the Resend dashboard), then the three env vars locally and in Vercel.
- Tests: 165 passing (templates, delivery, scheduling, config). Unit tests send no real email.
- **Hostinger spam (2026-11-17):** with Resend configured (`support@` sender, `leads@` inbox),
  admin notifications showed "Delivered" in Resend but seemed missing; they were in the `leads@`
  Spam folder. Fix on the mailbox side: mark as Not spam and whitelist `support@`. Admin
  notifications also no longer set Reply-To (common spam signal) and include a "Reply to <name>"
  mailto button. Customer confirmations keep Reply-To `leads@`.

## 0g. Update — Phase 4.5 forms connected to the lead system (2026-11-18, uncommitted)

Supersedes the §0e "Form compatibility" note and the equipment preselect items in §10 and §16.

- **Contact form** now has: inquiry type select ("What can we help with?", required, default
  General question, labels from `content/inquiry-types.ts`), company name, optional equipment
  select ("Not specified" default) and optional number of trucks, alongside name, email, phone,
  subject and message. Same components and tokens; two-column grid; no overflow at 390/1440 px.
- **Carrier form** payload matches `carrierInquirySchema` (test checks the keys). Preselects
  equipment from `/get-started?equipment=<slug>`; equipment pages' CTA links there.
- **Source page and submission id:** see `ARCHITECTURE.md` §6 "Submission metadata"
  (`src/lib/submission.ts`, `hooks/use-submission-id.ts`, `Idempotency-Key` header). Duplicates
  return 200 without a second row or email.
- Verified against Neon with fake data (rows deleted): contact and carrier rows stored with the
  right type, inquiry type, equipment, fleet size, `sourcePage` and header `submissionId`; a retry
  with the same key stored nothing new; invalid equipment returned 422.
- Tests: 146 passing.

## 0f. Update — Phase 4.4 Neon database and first migration (2026-11-18, uncommitted)

Supersedes "no database / no migrations" statements elsewhere in this file.

- **Neon:** project `haulix` (`long-wind-79273161`), org `org-proud-river-52523970`, AWS US East
  (Ohio), branch `main`, PostgreSQL 18, database `neondb`. Created with `neon init --no-config`
  (no `neon.ts`, no new npm dependencies); `.neon` link file is git-ignored.
- **Env:** `.env.local` holds `DATABASE_URL` (pooled, runtime) and `DIRECT_URL` (unpooled, Prisma
  CLI), plus `DATABASE_URL_UNPOOLED` and `NEON_*` from `neon init`. Never print or commit them.
- **Migration:** `prisma/migrations/20261117192326_init` (create-only SQL: enums `LeadType`,
  `LeadStatus`, `InquiryType`; tables `Lead`, `NewsletterSubscriber`; all §0e indexes and the unique
  `submissionId`). Applied with `prisma migrate dev`; `migrate status` is up to date.
- Smoke test (fake data, then deleted) passed: both lead types stored, default `NEW`, generated
  `submissionId`, duplicate `submissionId` rejected (P2002), `SPAM` status settable. Tables empty.
- Forms now store leads locally (database configured); Resend is still not configured, so
  notifications are skipped with a warning.

---

## 1. Project overview

HAULIX is a US-focused **truck dispatching company**. This repository is **Module 1: the public
marketing website**, a single Next.js (App Router) application whose business goal is **carrier
acquisition**: owner-operators and small fleets learn about the service, view equipment-specific
pages and pricing, and submit a carrier inquiry (lead) that reaches the HAULIX team.

Current state in one sentence: **the technical foundation is complete and clean (typecheck, lint,
format and unit tests all pass), every planned route exists and renders, but almost all content is
placeholder, no brand assets or photography exist, and the lead/contact backend is built but not
configured (no database, no Resend key), so forms currently return HTTP 503 "not available yet".**

- Repo: `github.com/amuqeet6041/Haulix` (remote `origin`), single commit.
- Package name `haulix`, version `0.1.0`, `private: true`, `engines.node >= 20.9.0`.
- Architecture: modular monolith, one Next.js app, no microservices.

## 2. Business context

- **Who HAULIX serves:** US owner-operators, independent truck owners, small and medium fleets
  (stated in `src/config/site.ts` and on the homepage trust badges).
- **What HAULIX does:** finds freight, supports rate negotiation, handles paperwork and
  broker/shipper communication so drivers can focus on driving.
- **Equipment types offered** (single source of truth: `src/content/services.ts`):
  Dry Van, Reefer, Flatbed, Step Deck, Power Only, Box Truck, Hotshot (7 slugs:
  `dry-van, reefer, flatbed, step-deck, power-only, box-truck, hotshot`).
- **Brand intent:** premium, modern, trustworthy American dispatch brand with a logistics-tech feel.
- **Content honesty rule (an explicit project decision, visible throughout the code):** no invented
  statistics, testimonials, customer logos, certifications, awards or prices. Testimonials array is
  intentionally empty; pricing shows "Pricing coming soon"/"Custom"; contact details and social links
  are empty strings and are not rendered while empty. Keep this rule.

### Customer journey (as implemented)

```
Home ──► Services ──► /services/[equipment] ──► Get Started (lead form) ──► POST /api/leads
  │         ▲                                         ▲
  ├──► How It Works ─────────────────────────────────┤  (CtaSection on most pages links
  ├──► Pricing (each card CTA → /get-started) ────────┤   to /get-started and /contact)
  ├──► FAQ / Resources / Blog (education, mostly empty)
  └──► Contact (contact form) ──► POST /api/contact
```

## 3. Project scope and modules

| Module   | Name                     | Status                                                                 |
| -------- | ------------------------ | ---------------------------------------------------------------------- |
| Module 1 | Public Marketing Website | **Current scope.** Foundation built; content and integrations pending. |
| Module 2 | Carrier Portal           | **Future. Do not implement.** `/portal` is reserved.                   |

Module 2 planned scope (from `src/app/portal/README.md`, nothing built): carrier registration/auth
(`/portal/login`, `/portal/register`), dashboard, truck management, documents, loads, earnings,
dispatcher communication, notifications. Authentication provider **not chosen**.

What exists for Module 2 today (preparation only):

- `src/app/portal/page.tsx`: "Coming soon" placeholder, `noindex`, **outside** the `(marketing)`
  route group, so it has no navbar/footer.
- `siteConfig.portal = { enabled: false, basePath: "/portal", loginPath: "/portal/login" }`. While
  `false`, the navbar shows "Carrier Login" as a disabled `<span>` with a "Soon" pill.
- `robots.ts` disallows `/portal/`.
- Prisma schema comment reserves Module 2 models (User, Truck, Load, Document).

## 4. Exact technology stack

Versions below are the **installed** versions in `node_modules` (verified), which match
`package.json` ranges and the README.

### Frontend

| Technology                                       | Version                                                         | Why                                               | Where                                                                       | Status / concerns                                                                                                                                                                                                                                                                               |
| ------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js (App Router)                             | 16.4.6                                                          | Framework, routing, SSG, metadata, route handlers | `src/app/**`, `next.config.ts`                                              | Fully in use. **Next 16 has breaking changes vs. older Next**: `params` is a `Promise` (used correctly in `/services/[equipment]`), `middleware` is now `proxy.ts`, dev types live in `.next/dev/types`. Always read `node_modules/next/dist/docs/` before writing Next code (see `AGENTS.md`). |
| React / React DOM                                | 19.3.1                                                          | UI                                                | everywhere                                                                  | In use. UI primitives still use `forwardRef` (works in React 19, not required).                                                                                                                                                                                                                 |
| TypeScript                                       | 6.0.3                                                           | Type safety                                       | `tsconfig.json`                                                             | `strict`, `noUncheckedIndexedAccess`, `moduleResolution: bundler`, alias `@/* → ./src/*`. `tests/e2e` is **excluded** from typecheck.                                                                                                                                                           |
| Tailwind CSS                                     | 4.3.5                                                           | Styling                                           | `src/app/globals.css`, `postcss.config.mjs` (`@tailwindcss/postcss`)        | CSS-first config (no `tailwind.config.*`). Tokens via `:root` + `@theme inline`.                                                                                                                                                                                                                |
| tw-animate-css                                   | 1.4.0                                                           | Enter/exit + accordion keyframes                  | imported in `globals.css`                                                   | In use by sheet, dropdown and accordion animations (verified it ships `accordion-down/up`).                                                                                                                                                                                                     |
| shadcn/ui (pattern)                              | n/a (`components.json`, style `new-york`, base `slate`, RSC on) | Component conventions                             | `src/components/ui/*`                                                       | **Hand-written shadcn-style** primitives, not the full CLI set: `button, input (Input/Textarea/Select), label, accordion, dropdown-menu, sheet`. `components.json` exists so `npx shadcn add` should work, but nothing confirms it was used.                                                    |
| Radix UI                                         | accordion 1.3.x, dialog 1.3.x, dropdown-menu 2.2.x, slot 1.5.x  | Accessible primitives                             | `ui/accordion`, `ui/sheet` (Dialog), `ui/dropdown-menu`, `ui/button` (Slot) | All four packages are used.                                                                                                                                                                                                                                                                     |
| class-variance-authority / clsx / tailwind-merge | 0.7.1 / 2.1.1 / 3.7.0                                           | Variants and class merging                        | `ui/button.tsx`, `lib/utils.ts` (`cn`)                                      | In use.                                                                                                                                                                                                                                                                                         |
| lucide-react                                     | 1.73.0                                                          | Icons                                             | many components                                                             | In use. Icon names mapped in `services/service-icon.tsx`.                                                                                                                                                                                                                                       |
| Framer Motion                                    | 14.14.0                                                         | Scroll-reveal animation                           | **only** `components/shared/reveal.tsx`                                     | In use, homepage only. Respects reduced motion. Heavy dependency for one effect (potential improvement, not a bug).                                                                                                                                                                             |
| React Hook Form + @hookform/resolvers            | 7.92.0 / 7.0.6                                                  | Form state                                        | `components/forms/lead-form.tsx`, `contact-form.tsx`                        | In use with `zodResolver`.                                                                                                                                                                                                                                                                      |
| Zod                                              | 4.6.7                                                           | Validation (shared client/server)                 | `src/validations/*`, `src/lib/validations/primitives.ts`                    | In use. Uses Zod 4 APIs (`z.email()`, `{ error: ... }`).                                                                                                                                                                                                                                        |
| geist                                            | 1.9.2                                                           | Fonts (Geist Sans/Mono, bundled)                  | `src/app/layout.tsx`                                                        | Sans used; Mono loaded but `font-mono` is used nowhere.                                                                                                                                                                                                                                         |

### Backend and infrastructure

| Technology                     | Version                                          | Where                                                           | Status / concerns                                                                                                                        |
| ------------------------------ | ------------------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Route Handlers (REST-ish JSON) | Next 16                                          | `src/app/api/{leads,contact,newsletter}/route.ts`               | Implemented, `runtime = "nodejs"`, POST only.                                                                                            |
| PostgreSQL                     | n/a                                              | `prisma/schema.prisma`                                          | **Not configured** (`DATABASE_URL` empty). No migrations committed.                                                                      |
| Prisma ORM                     | 7.10.1 (`prisma`, `@prisma/client`)              | `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/prisma.ts` | Generator `prisma-client` (new Prisma 7 generator) → `src/generated/prisma` (git-ignored, exists locally, regenerated by `postinstall`). |
| @prisma/adapter-pg + pg        | 7.10.1 / 8.23.1                                  | `src/lib/prisma.ts`                                             | Driver adapter; client created lazily in `getPrisma()`. `serverExternalPackages: ["pg"]` in `next.config.ts`.                            |
| Resend                         | 6.38.1                                           | `src/lib/email/*`, `src/services/email.service.ts`              | Implemented, **not configured**. Lazy client. Fallback sender `onboarding@resend.dev` (dev only).                                        |
| dotenv                         | 18.0.10 (dev)                                    | `prisma.config.ts`                                              | See issue K1: loads `.env`, not `.env.local`.                                                                                            |
| Env management                 | `.env.example` (tracked), `.env.local` (ignored) | root                                                            | See section 13.                                                                                                                          |

### Development and QA

| Tool                  | Version                                      | Config                                                                                                                            | Status                                                                                                                                                       |
| --------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ESLint                | 9.39.5, flat config                          | `eslint.config.mjs`: `eslint-config-next` core-web-vitals + typescript; `no-explicit-any: error`; `consistent-type-imports: warn` | Passes clean.                                                                                                                                                |
| Prettier              | 3.10.1 + `prettier-plugin-tailwindcss` 0.8.1 | `.prettierrc` (semi, double quotes, trailing commas, width 100), `.prettierignore`                                                | Passes. Tailwind class sorting via `cn`/`cva`.                                                                                                               |
| Vitest                | 5.1.0, jsdom 31, `@vitejs/plugin-react` 6.3  | `vitest.config.mts`, `vitest.setup.ts` (jest-dom)                                                                                 | 3 files / 20 tests pass. No coverage provider installed.                                                                                                     |
| React Testing Library | 16.3.3 + user-event 14.6.12 + jest-dom 7.0.1 | —                                                                                                                                 | In use.                                                                                                                                                      |
| Playwright            | 1.65.1                                       | `playwright.config.ts` (chromium only, starts `npm run dev`)                                                                      | 4 smoke tests written. **Not run in this audit**; Chromium browser not found in the default Windows cache (`npx playwright install chromium` likely needed). |
| Git                   | —                                            | `.gitignore`                                                                                                                      | Only `main`, 1 commit; 112 tracked files. No CI (`.github/` absent).                                                                                         |
| Deployment            | Vercel (documented only)                     | no `vercel.json` (not required)                                                                                                   | Not deployed / not verified.                                                                                                                                 |

Runtime noted: local machine runs **Node v24.18.0 / npm 11.16.0**; README says it was built with Node
22.23.4 / npm 10.9.9. Both satisfy `>=20.9.0`.

## 5. Folder structure

```
Haulix/
├── AGENTS.md                 Auto-written by `next dev`: "This is NOT the Next.js you know" (tracked)
├── ARCHITECTURE.md, README.md  Accurate docs (verified); small discrepancies listed in §16
├── PROJECT_CONTEXT.md        This file
├── .env.example              Tracked template (all values empty)
├── .env.local                Ignored; currently identical to .env.example (nothing configured)
├── components.json           shadcn config
├── eslint.config.mjs, .prettierrc, .prettierignore
├── next.config.ts, postcss.config.mjs, tsconfig.json
├── vitest.config.mts, vitest.setup.ts, playwright.config.ts
├── prisma.config.ts          Prisma 7 datasource URL config
├── prisma/schema.prisma      Unified Lead, NewsletterSubscriber (no migrations/ folder; see §0e)
├── public/{fonts,icons,images,logos}/README.md   Placeholders only. NO real assets.
├── src/
│   ├── app/
│   │   ├── layout.tsx        Root: <html lang="en">, Geist fonts, skip link, Organization JSON-LD
│   │   ├── globals.css       ALL design tokens
│   │   ├── error.tsx, loading.tsx, not-found.tsx
│   │   ├── robots.ts, sitemap.ts, icon.svg (favicon)
│   │   ├── (marketing)/      Route group: layout.tsx = Navbar + <main id="main-content"> + Footer
│   │   │   ├── page.tsx (/), about, blog, contact, faq, get-started, how-it-works,
│   │   │   ├── pricing, privacy-policy, resources, terms
│   │   │   └── services/page.tsx, services/[equipment]/page.tsx
│   │   ├── portal/           page.tsx (placeholder) + README.md   ← Module 2 reserved
│   │   └── api/{leads,contact,newsletter}/route.ts
│   ├── components/
│   │   ├── ui/               button, input(+Textarea, Select), label, accordion, dropdown-menu, sheet
│   │   ├── shared/           breadcrumbs, container, cta-section, empty-state, faq-accordion,
│   │   │                     feature-card, form-field, json-ld, loading-state, logo, page-header,
│   │   │                     primary-button, secondary-button, reveal, section-heading, trust-badge
│   │   ├── layout/           navbar (client), footer (server)
│   │   ├── forms/            lead-form, contact-form (client), form-status
│   │   ├── home/             testimonial-card
│   │   ├── services/         service-card, service-icon
│   │   └── pricing/          pricing-card
│   ├── config/               site.ts, navigation.ts, metadata.ts
│   ├── content/              services.ts, faqs.ts, pricing.ts, process.ts, testimonials.ts ([])
│   ├── hooks/                use-post-json.ts (+README)
│   ├── lib/                  utils.ts, seo.ts, prisma.ts, api-response.ts,
│   │                         email/{client,templates}.ts, validations/primitives.ts
│   ├── services/             lead, contact, newsletter, email (*.service.ts)
│   ├── types/                api.ts (+README)
│   ├── validations/          lead.ts, contact.ts, newsletter.ts, index.ts (barrel)
│   └── generated/prisma/     GENERATED, git-ignored, ESLint/Prettier-ignored
└── tests/
    ├── unit/                 utils.test.ts, validations.test.ts, components.test.tsx
    └── e2e/                  smoke.spec.ts
```

Ignored/generated: `node_modules/`, `.next/` (only `dev/` present, so **no production build has been
made locally**), `src/generated/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`, `.env*` except example.

## 6. Application architecture

Layers (from `ARCHITECTURE.md`, verified in code):

| Layer                | Location                                            | Rule                                                        |
| -------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| Routes / pages       | `src/app`                                           | Compose components, export `metadata` via `buildMetadata()` |
| Presentation         | `components/layout, home, services, pricing, forms` | Page sections                                               |
| Reusable UI          | `components/ui`, `components/shared`                | Generic building blocks                                     |
| Application services | `src/services`                                      | Business logic; return `ServiceResult`, never throw         |
| Validation           | `src/validations`, `src/lib/validations`            | Zod schemas shared by form and API                          |
| Data access          | `src/lib/prisma.ts`, `prisma/`                      | Lazy Prisma client                                          |
| Config / content     | `src/config`, `src/content`                         | Site settings, nav, editable copy                           |

**Dependency direction:** routes → components/services → validations/lib → config/content.
Components never import services or Prisma (verified: no component imports `@/services` or
`@/lib/prisma`). Services never import components.

### Server/client boundaries (verified)

`"use client"` appears only in: `layout/navbar.tsx`, `shared/faq-accordion.tsx`, `shared/reveal.tsx`,
`forms/lead-form.tsx`, `forms/contact-form.tsx`, `ui/accordion.tsx`, `ui/dropdown-menu.tsx`,
`ui/sheet.tsx`, `hooks/use-post-json.ts`, and `app/error.tsx` (required by Next). All pages and
layouts are Server Components. Everything renders statically except the API routes.

### Data flow (forms)

```
LeadForm / ContactForm (RHF + zodResolver(schema))      client validation, inline errors
  └─ usePostJson(endpoint).submit(data)  → fetch POST JSON
       └─ route.ts: parseBody(request, schema)          400 bad JSON · 422 + fieldErrors
            ├─ honeypot `website` filled → silentSuccess() 200, no work
            └─ service.submitX(data)
                 ├─ store via Prisma        (only if DATABASE_URL)
                 └─ notify via Resend       (only if RESEND_API_KEY && CONTACT_EMAIL)  [in parallel]
            └─ respondToServiceResult():  200 ok if stored OR emailed
                                          503 "not available yet" if nothing configured
                                          500 if configured but everything failed
  └─ FormStatus shows body.message (role=status / role=alert); form resets on success
```

Newsletter: `subscribeToNewsletter` upserts by email; database only (no email). **No UI calls it.**

### Error handling

- API: uniform `ApiResponse` type (`src/types/api.ts`), `parseBody`, `respondToServiceResult`.
  Services catch and `console.error` with a `[lead]`/`[contact]`/`[newsletter]`/`[email]` prefix.
- UI: root `app/error.tsx` (client, "Try again" + home), `app/not-found.tsx` (renders Navbar +
  Footer itself, `noindex`), `app/loading.tsx` (spinner). No `global-error.tsx`.

### Scalability / maintainability verdict

Sound for a marketing site and for adding Module 2 in the same codebase: clear layering, content
separated from components, one schema per form shared by client and server, tokens centralised,
equipment pages data-driven. Weak points are listed in §16 (none are structural).

## 7. Routing structure

| URL                                        | File                                        | Rendering                                            | Content status                                                                                                          |
| ------------------------------------------ | ------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `/`                                        | `(marketing)/page.tsx`                      | Static                                               | Real layout; placeholder copy. Hero, Services grid (7 cards), How-it-works (4 steps), Testimonials (hidden, empty), CTA |
| `/about`                                   | `(marketing)/about/page.tsx`                | Static                                               | **Placeholder** (one paragraph + "Content placeholder" note)                                                            |
| `/services`                                | `(marketing)/services/page.tsx`             | Static                                               | Implemented (7 ServiceCards)                                                                                            |
| `/services/[equipment]`                    | `(marketing)/services/[equipment]/page.tsx` | SSG ×7, `dynamicParams = false` (unknown slug → 404) | Implemented template; generic copy, 3 highlights each                                                                   |
| `/pricing`                                 | `(marketing)/pricing/page.tsx`              | Static                                               | 3 tiers, **no prices** ("Pricing coming soon" / "Custom")                                                               |
| `/how-it-works`                            | `(marketing)/how-it-works/page.tsx`         | Static                                               | 4 steps (placeholder copy)                                                                                              |
| `/contact`                                 | `(marketing)/contact/page.tsx`              | Static + client form                                 | Form implemented; no phone/email/address shown (empty config)                                                           |
| `/faq`                                     | `(marketing)/faq/page.tsx`                  | Static                                               | 5 FAQs (placeholder) + FAQPage JSON-LD                                                                                  |
| `/resources`                               | `(marketing)/resources/page.tsx`            | Static                                               | **EmptyState** "coming soon"                                                                                            |
| `/blog`                                    | `(marketing)/blog/page.tsx`                 | Static                                               | **EmptyState** "No articles yet"; no post routes, no CMS/MDX                                                            |
| `/get-started`                             | `(marketing)/get-started/page.tsx`          | Static + client form                                 | Lead form implemented                                                                                                   |
| `/privacy-policy`                          | `(marketing)/privacy-policy/page.tsx`       | Static                                               | **Placeholder**, needs legal text                                                                                       |
| `/terms`                                   | `(marketing)/terms/page.tsx`                | Static                                               | **Placeholder**, needs legal text                                                                                       |
| `/portal`                                  | `portal/page.tsx`                           | Static, `noindex`                                    | Module 2 placeholder only                                                                                               |
| `/api/leads`                               | `api/leads/route.ts`                        | Dynamic, Node                                        | POST carrier inquiry                                                                                                    |
| `/api/contact`                             | `api/contact/route.ts`                      | Dynamic, Node                                        | POST contact message                                                                                                    |
| `/api/newsletter`                          | `api/newsletter/route.ts`                   | Dynamic, Node                                        | POST subscribe (no UI)                                                                                                  |
| `/robots.txt`, `/sitemap.xml`, `/icon.svg` | `robots.ts`, `sitemap.ts`, `icon.svg`       | Generated                                            | Implemented                                                                                                             |

Navigation (`src/config/navigation.ts`): Home, About, **Services ▾** (All Services + 7 equipment),
Pricing, How It Works, **Resources ▾** (Resources, Blog, FAQ), Contact; right side: Carrier Login
(disabled) + **Get Started** button. Footer columns: Company, Services, Equipment, Contact, plus
legal links and ©year. Adding an equipment entry to `content/services.ts` updates nav, footer,
sitemap, service pages, lead form `<select>` and Zod enum automatically.

## 8. Component inventory

### `components/ui` (primitives)

| Component                                   | Notes                                                                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button` (`button.tsx`)                     | cva variants `primary, secondary, onDark, ghost, link`; sizes `sm (h-9), md (h-11, default), lg (h-12)`; `asChild` via Radix Slot. `ghost` and `link` variants are currently unused. |
| `Input`, `Textarea`, `Select` (`input.tsx`) | Shared field classes; `aria-[invalid=true]` turns border red. Native `<select>`.                                                                                                     |
| `Label`                                     | Plain styled `<label>`.                                                                                                                                                              |
| `Accordion*`                                | Radix accordion, chevron rotates, height animation.                                                                                                                                  |
| `DropdownMenu*`                             | Radix dropdown (portal), used in desktop nav.                                                                                                                                        |
| `Sheet*`                                    | Radix Dialog as right slide-over, navy background; mobile nav.                                                                                                                       |

### `components/shared`

| Component                           | Responsibility                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Container`                         | `max-w-7xl` (or `narrow` → `max-w-3xl`), `px-5 sm:px-8`.                                                                          |
| `SectionHeading`                    | Eyebrow + heading (`as` h1/h2/h3) + description, `onDark`, `align`.                                                               |
| `PageHeader`                        | Dark `bg-hero-gradient` band with Breadcrumbs and the page's single `<h1>`. Used by every inner page.                             |
| `Breadcrumbs`                       | Prepends Home, renders `nav[aria-label=Breadcrumb]` and BreadcrumbList JSON-LD.                                                   |
| `PrimaryButton` / `SecondaryButton` | Wrap `Button`; `href` renders a `next/link`. Secondary has `onDark`.                                                              |
| `CtaSection`                        | Closing gradient band, defaults: Get Started + Contact Us. Used on most pages (not Blog, Resources, Contact, Get Started, legal). |
| `FeatureCard`                       | Card with optional `icon` or `step` number. Only `step` mode is used.                                                             |
| `TrustBadge`                        | Pill with check icon. Rule in code: factual statements only.                                                                      |
| `FaqAccordion`                      | Client wrapper over Accordion for `Faq[]`.                                                                                        |
| `FormField`                         | Label + required asterisk + hint/error `<p id="{id}-message">` (error has `role=alert`).                                          |
| `EmptyState`, `LoadingState`        | Empty/loading UI.                                                                                                                 |
| `Logo`                              | **Temporary** inline SVG mark (blue rounded square with an "H") + "HAULIX" wordmark, links home. Same mark as `app/icon.svg`.     |
| `JsonLd`                            | Safe `<script type="application/ld+json">` (escapes `<`).                                                                         |
| `Reveal`                            | Framer Motion fade-up on scroll, `once: true`; plain div under reduced motion.                                                    |

### Feature components

`layout/Navbar` (client: active state via `usePathname`, `aria-current`, dropdowns, mobile Sheet,
sticky `bg-navy-900/95 backdrop-blur`), `layout/Footer` (server), `forms/LeadForm`,
`forms/ContactForm`, `forms/FormStatus`, `services/ServiceCard` (whole card is a link, hover lift),
`services/ServiceIcon` (key → lucide icon), `pricing/PricingCard` (highlighted tier uses primary CTA
and `border-brand-600 shadow-lift`), `home/TestimonialCard` (unused until testimonials exist).

## 9. Design system and brand identity

**Actual direction (from code):** dark navy + electric blue, clean SaaS/logistics-tech look, white
content sections alternating with light slate `bg-surface`, dark gradient hero and page-header
bands, rounded cards with soft shadows, restrained motion. It matches the intended "premium, modern,
trustworthy" direction **structurally**, but it is still **generic**: no photography, no final logo,
no custom illustration, no brand typeface beyond Geist, and the palette comments say "proposed
starting colors". There is no dark mode.

### Tokens (`src/app/globals.css` is the ONLY place raw colors live)

| Token                             | Value                                               | Tailwind class                                 | Use                                                                                      |
| --------------------------------- | --------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `--navy-950`                      | `#080e19`                                           | `bg-navy-950`                                  | Footer, gradient end, overlay                                                            |
| `--navy-900`                      | `#0b1220`                                           | `bg-navy-900`                                  | Primary navy: navbar, icon tiles, sheet; also `--foreground` (headings) and `themeColor` |
| `--navy-800`                      | `#111c2e`                                           | `bg-navy-800`                                  | Defined, currently unused                                                                |
| `--brand-600`                     | `#2563eb`                                           | `text/bg-brand-600`, `primary`, `ring`         | Primary action, links, eyebrows on light                                                 |
| `--brand-500`                     | `#3b82f6`                                           | `brand-500`, `accent`                          | Hover state, eyebrows/icons on dark                                                      |
| `--surface-light`                 | `#f8fafc`                                           | `bg-surface`                                   | Alternating section bg, empty states                                                     |
| `--slate-body`                    | `#475569`                                           | `text-muted-foreground`                        | **Body text color** (set on `body`)                                                      |
| `--slate-muted`                   | `#94a3b8`                                           | `text-subtle-foreground`, `text-on-dark-muted` | Secondary text; on dark backgrounds                                                      |
| `--slate-border`                  | `#e2e8f0`                                           | `border-border`                                | Default border for all elements                                                          |
| `--destructive`                   | `#dc2626`                                           | `text-destructive`                             | Errors, required asterisk                                                                |
| `--radius`                        | `0.75rem`                                           | `rounded-sm/md/lg/xl/2xl` = 8/10/12/16/20px    | Buttons `rounded-lg`, cards `rounded-2xl`, CTA band `rounded-3xl`                        |
| `--shadow-soft` / `--shadow-lift` | navy-tinted layered shadows                         | `shadow-soft`, `shadow-lift`                   | Rest / hover / highlighted                                                               |
| `.bg-hero-gradient`               | radial blue glow top-right over navy-900→950 linear | utility class                                  | Home hero, PageHeader, CtaSection                                                        |

Colors outside `globals.css`: `#0b1220` in `config/metadata.ts` (themeColor), `#2563eb`/`#fff` in
`app/icon.svg`, `#64748b` inline in email templates. All are justified (non-CSS contexts).

### Typography

- Font: **Geist Sans** (`--font-geist-sans`) for everything; Geist Mono loaded, unused.
- Base: `h1–h4` bold (700), `letter-spacing -0.02em`, `line-height 1.1`, color navy-900; body
  slate-600, antialiased.
- Scale in use: home hero h1 `text-4xl sm:text-6xl lg:text-7xl`; section/page h1/h2
  `text-3xl sm:text-4xl lg:text-5xl`; CTA h2 `text-3xl sm:text-4xl`; card h3 `text-lg`/`text-xl`;
  eyebrow `text-sm font-semibold tracking-widest uppercase` (brand-600 light / brand-500 dark);
  body copy `text-base`/`sm:text-lg leading-relaxed`; card copy `text-sm`.
- Logo wordmark: `text-xl font-extrabold tracking-tight`.

### Buttons and component conventions

- Primary: solid brand-600, white text, `shadow-soft`, hover brand-500.
- Secondary: white bg, border, hover blue border + blue text. On dark: translucent white border/bg.
- Cards: `rounded-2xl border border-border bg-background p-6 shadow-soft`, hover `shadow-lift`
  (ServiceCard also `-translate-y-0.5` and blue border). Icon tile: `size-11 rounded-xl
bg-navy-900 text-brand-500`.
- Section rhythm: `py-20 sm:py-24` (home), `py-16 sm:py-20` (inner); grids `gap-6`,
  `sm:grid-cols-2 lg:grid-cols-3/4`.
- Focus: global `:focus-visible` 2px brand-600 outline with 2px offset; inputs add a ring.

### Motion

`Reveal` only (fade + 16px rise, 0.45s easeOut, stagger ≤0.25s, once). CSS transitions of 200ms on
hover. Radix sheet/dropdown/accordion animations via tw-animate-css. `prefers-reduced-motion`
respected by `Reveal` and smooth scroll.

### Responsive behavior

Mobile-first Tailwind. Navbar collapses below `lg` (1024px) into a "Menu" button opening the
right-hand Sheet (groups shown as labelled lists, Carrier Login + full-width Get Started at the
bottom). Hero CTAs stack below `sm`. Forms are one column below `sm`, two above. Not visually
verified in a browser during this audit.

## 10. Existing functionality

| Feature                                          | Classification                           | Notes                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All 13 marketing routes + `/portal`              | **Fully implemented** (as routes)        | Render statically; most copy is placeholder.                                                                                                                                                                                                                                                                                          |
| Navbar (desktop dropdowns, active state, sticky) | **Fully implemented**                    |                                                                                                                                                                                                                                                                                                                                       |
| Mobile navigation (Sheet)                        | **Fully implemented**                    | No active-link indicator in mobile menu.                                                                                                                                                                                                                                                                                              |
| Footer                                           | **Fully implemented**                    | Contact column falls back to "Use our contact form"; social hidden (empty).                                                                                                                                                                                                                                                           |
| Homepage sections                                | **Partially implemented**                | Structure done; no imagery, no stats/trust content, testimonials hidden.                                                                                                                                                                                                                                                              |
| Equipment service pages (7)                      | **Partially implemented**                | Template works; content thin and generic.                                                                                                                                                                                                                                                                                             |
| Pricing                                          | **Placeholder**                          | No prices decided.                                                                                                                                                                                                                                                                                                                    |
| About, Privacy Policy, Terms                     | **Placeholder**                          | Legal text must come from a qualified professional.                                                                                                                                                                                                                                                                                   |
| Resources, Blog                                  | **Placeholder**                          | EmptyState only. No blog infrastructure.                                                                                                                                                                                                                                                                                              |
| Lead form (`/get-started`)                       | **Partially implemented**                | UI + client/server validation complete. Submission returns 503 until DB or Resend is configured. Server `fieldErrors` are not mapped back onto fields (only the summary message shows).                                                                                                                                               |
| Contact form (`/contact`)                        | **Partially implemented**                | Same as lead form.                                                                                                                                                                                                                                                                                                                    |
| Newsletter                                       | **Partially implemented / backend only** | API + service + model exist; **no form anywhere in the UI**.                                                                                                                                                                                                                                                                          |
| Form validation (Zod, shared)                    | **Fully implemented**                    | Unit-tested.                                                                                                                                                                                                                                                                                                                          |
| Honeypot spam trap                               | **Fully implemented**                    | Only protection; no rate limiting/CAPTCHA.                                                                                                                                                                                                                                                                                            |
| Database integration                             | **Requires verification**                | Code complete, never run against a real DB; no migrations.                                                                                                                                                                                                                                                                            |
| Email (Resend)                                   | **Requires verification**                | Code complete, never run with a key; sender domain not verified.                                                                                                                                                                                                                                                                      |
| CTA buttons / links                              | **Fully implemented**                    | Every CTA routes to a real page. **The only non-working control is "Carrier Login"**, which is intentionally disabled (not focusable, "Soon" pill). No dead `href="#"` links found.                                                                                                                                                   |
| Equipment-page CTA → lead form                   | **Partially implemented**                | Links to `/get-started` but does not preselect the equipment.                                                                                                                                                                                                                                                                         |
| Animations                                       | **Fully implemented**                    | Reveal on homepage only.                                                                                                                                                                                                                                                                                                              |
| Error / 404 / loading states                     | **Partially implemented**                | Exist; root `error.tsx` and `loading.tsx` render without navbar/footer and `error.tsx` has no `id="main-content"`; no `global-error.tsx`; errors are not reported anywhere.                                                                                                                                                           |
| Accessibility                                    | **Partially implemented**                | Good base: skip link, landmarks, labels, `aria-invalid`/`aria-describedby`, `role=alert/status`, `aria-current`, reduced motion, focus outlines. Issue: `text-subtle-foreground` (#94a3b8) on white is ≈2.6:1, below WCAG AA (used for price notes, testimonial role, placeholder note, input placeholders). No automated a11y tests. |
| SEO metadata                                     | **Partially implemented**                | `metadataBase`, title template, per-page canonical/OG/Twitter, Organization/BreadcrumbList/FAQPage JSON-LD, robots, sitemap. Missing: OG image (Twitter card is `summary_large_image` with no image), real domain, `lastModified` in sitemap, richer schema (LocalBusiness/Service).                                                  |
| Analytics (GA4), Sentry                          | **Not implemented**                      | Env names reserved only; packages not installed.                                                                                                                                                                                                                                                                                      |
| Blog posts / CMS                                 | **Not implemented**                      |                                                                                                                                                                                                                                                                                                                                       |
| Carrier Portal                                   | **Not implemented (by design)**          |                                                                                                                                                                                                                                                                                                                                       |

## 11. Database architecture

PostgreSQL via Prisma 7, driver adapter `@prisma/adapter-pg`. Datasource URL is **not** in
`schema.prisma` (Prisma 7 rule); `prisma.config.ts` uses `DIRECT_URL` → `DATABASE_URL` and sets
no datasource when neither exists (Phase 4.2, §0d). Runtime client (`lib/prisma.ts`) uses
`DATABASE_URL` only, cached on `globalThis`, created on first `getPrisma()` call.

As of Phase 4.3 (§0e), see `ARCHITECTURE.md` §6 for the full field table:

| Model                  | Summary                                                                                                               | Indexes                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Lead`                 | Unified carrier inquiries and contact messages; `type`, `status`, contact, dispatch, inquiry, server and admin fields | `(status, createdAt)`, `(type, createdAt)`, `email`, `(ipHash, createdAt)`; unique `submissionId` |
| `NewsletterSubscriber` | `id`, `email` unique, `createdAt`                                                                                     | unique email                                                                                      |
| enum `LeadType`        | `CARRIER_INQUIRY, CONTACT`                                                                                            | —                                                                                                 |
| enum `LeadStatus`      | `NEW, CONTACTED, QUALIFIED, ONBOARDED, REJECTED, SPAM`                                                                | —                                                                                                 |
| enum `InquiryType`     | `GENERAL, DISPATCH_SERVICES, PRICING, EQUIPMENT, PARTNERSHIP, OTHER`                                                  | —                                                                                                 |

- **No `prisma/migrations/` folder.** Nothing has been migrated anywhere.
- No admin UI to read leads (only Prisma Studio via `npm run db:studio`).
- `equipment` is a free `String` in the DB; only Zod restricts it to the 7 slugs.
- Module 2 models will be added to the same schema later.

## 12. API and integration status

| Endpoint          | Method | Body schema            | Behavior                                               | Status                           |
| ----------------- | ------ | ---------------------- | ------------------------------------------------------ | -------------------------------- |
| `/api/leads`      | POST   | `carrierInquirySchema` | Store as `CARRIER_INQUIRY`, then email; ok once stored | Built, unconfigured → 503        |
| `/api/contact`    | POST   | `contactSchema`        | Store as `CONTACT`, then email; ok once stored         | Built, unconfigured → 503        |
| `/api/newsletter` | POST   | `newsletterSchema`     | DB upsert only                                         | Built, unconfigured → 503, no UI |

Responses: `{ ok: true, message }` or `{ ok: false, message, fieldErrors? }`. Status codes: 200, 400
(invalid JSON), 422 (validation), 503 (not configured), 500 (configured but failed). Honeypot → 200.

Validation rules (Phase 4.3): full name 2–100; email valid, trimmed, lowercased, ≤254; phone a
US number (10 digits, or 11 starting with 1), required for carrier inquiries and optional for
contact; company ≤150; MC/DOT optional, digits only, 5–10; equipment enum of slugs (required for
carrier inquiries, optional for contact); fleetSize int 1–500 (same split); lanes ≤300; carrier
message optional ≤2000; contact `inquiryType` required (enum), subject optional ≤150, message
10–3000.

Email (Resend): notification to `CONTACT_EMAIL`, `replyTo` = submitter, HTML-escaped table + plain
text. No auto-reply/confirmation email to the carrier. No newsletter email provider.

Not integrated: CRM, analytics, error monitoring, rate limiting, CAPTCHA, CMS.

## 13. Environment variable requirements (names only)

All are documented in `.env.example`. `.env.local` exists and is **byte-identical to
`.env.example`**, i.e. **every variable is currently empty / not configured**. No secrets are
present in tracked files (a scan found only the intentional `placeholder:placeholder@localhost`
fallback URL in `prisma.config.ts`).

| Name                            | Scope                     | Purpose                                           | Required?                                                      | Configured now                        |
| ------------------------------- | ------------------------- | ------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| `DATABASE_URL`                  | server                    | Pooled Postgres URL for runtime                   | For lead/contact/newsletter storage                            | No                                    |
| `DIRECT_URL`                    | server                    | Direct URL for Prisma CLI/migrations              | For migrations                                                 | No                                    |
| `NEXT_PUBLIC_SITE_URL`          | public (inlined at build) | metadataBase, canonical, sitemap, robots, JSON-LD | **Yes for production** (falls back to `http://localhost:3000`) | No                                    |
| `RESEND_API_KEY`                | server                    | Resend API key                                    | For email notifications                                        | No                                    |
| `CONTACT_EMAIL`                 | server                    | Inbox receiving notifications                     | With Resend                                                    | No                                    |
| `EMAIL_FROM`                    | server                    | Verified sender                                   | Production email                                               | No (falls back to Resend test sender) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | public                    | GA4                                               | Optional, not wired                                            | No                                    |
| `SENTRY_DSN`                    | server                    | Sentry                                            | Optional, Sentry not installed                                 | No                                    |

## 14. Testing setup and results

Verified in this audit (2026-11-17, Node v24.18.0):

| Command                | Result                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run typecheck`    | Pass (exit 0)                                                                                   |
| `npm run lint`         | Pass, no warnings                                                                               |
| `npm run format:check` | Pass ("All matched files use Prettier code style!")                                             |
| `npm run test`         | **3 files, 20 tests passed** (Vitest 5.1.0)                                                     |
| `npm run test:e2e`     | Not run (needs dev server + Playwright Chromium, which was not found in the default cache)      |
| `npm run build`        | **Not run** (outside the agreed read-only command set). No production build exists in `.next/`. |

Coverage of the 20 unit tests: `cn`, `joinUrl` (4); lead/contact/newsletter Zod schemas (11);
`PrimaryButton`, `FormField`, `EmptyState`, `FaqAccordion` (5). E2E (4): home h1 + main nav,
`/get-started` form visible, `/services/dry-van` h1, unknown route → 404.

Not tested: API routes, services (`submitLead` result matrix, honeypot), email templates/escaping,
`parseBody`, `usePostJson`, LeadForm/ContactForm submission, Navbar/mobile menu, SEO output
(sitemap/robots/metadata), accessibility. No coverage tooling installed. No CI pipeline runs any
of these.

## 15. Current development status

- **Phase complete:** project initialization and technical foundation (stack, tooling, layered
  architecture, tokens, primitives, all routes, SEO plumbing, validated forms, service layer,
  Prisma schema, docs, tests).
- **Phase not started:** real content and brand assets, design refinement, integrations go-live,
  deployment.
- Dev server: `npm run dev` → `http://localhost:3000` (reported working by the user; `.next/dev`
  exists, consistent with that).

## 16. Known issues and technical debt

### Actual problems (should be fixed)

| #   | Issue                                                                                                                                                                                                                                                                                                     | Where                                            | Impact                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| K1  | **Fixed in Phase 4.2 (§0d).** `prisma.config.ts` imported `dotenv/config`, which loads **`.env`**, but README tells users to put values in **`.env.local`**. Prisma CLI (`migrate`, `studio`) will ignore `.env.local` and fall back to the placeholder URL.                                              | `prisma.config.ts`                               | Migrations will fail/confuse until fixed (load `.env.local` explicitly, or document `.env`). |
| K2  | **Fixed in Phase 4.2 (§0d).** "Configured" check mismatch: services decide `not_configured` vs `failed` using `RESEND_API_KEY` alone, but email only sends when **both** `RESEND_API_KEY` and `CONTACT_EMAIL` are set. With key set and inbox empty, users get 500 "something went wrong" instead of 503. | `services/lead.service.ts`, `contact.service.ts` | Misleading error; easy fix (use `isEmailConfigured()`).                                      |
| K3  | Contrast: `text-subtle-foreground` (#94a3b8) on white ≈2.6:1, fails WCAG AA for text.                                                                                                                                                                                                                     | 5 usages + input placeholders                    | Accessibility.                                                                               |
| K4  | **Fixed in Phase 4.2 (§0d).** Server-side `fieldErrors` (422) are returned but the forms only show the summary message, not per-field errors.                                                                                                                                                             | `use-post-json.ts`, forms                        | Minor UX gap (client schema is identical, so rarely hit).                                    |
| K5  | **Fixed in Phase 4.2 (§0d).** `usePostJson` treated any non-JSON response (e.g. platform 500/413 HTML page) as "could not reach the server".                                                                                                                                                              | `hooks/use-post-json.ts`                         | Misleading message in edge cases.                                                            |
| K6  | Root `error.tsx`/`loading.tsx` render without site chrome; `error.tsx` `<main>` lacks `id="main-content"` (skip link target missing); no `global-error.tsx`; errors not logged/reported.                                                                                                                  | `src/app`                                        | Resilience/UX.                                                                               |
| K7  | Twitter card `summary_large_image` and OG tags with **no image**.                                                                                                                                                                                                                                         | `config/metadata.ts`, `lib/seo.ts`               | Poor link previews.                                                                          |
| K8  | No rate limiting / CAPTCHA on public POST endpoints (honeypot only).                                                                                                                                                                                                                                      | `src/app/api/*`                                  | Spam/abuse risk once live. Documented as intentional gap.                                    |

### Potential improvements / debt (not bugs)

- Unused code: `Button` variants `ghost`/`link`, `FeatureCard` `icon` mode, `--navy-800`, Geist Mono,
  `TestimonialCard` (until content), `NavGroup.href` (not used by desktop/mobile nav).
- Framer Motion used for a single fade-up; CSS/`tw-animate-css` could replace it (bundle size).
- `next.config.ts` comment says "Keep Prisma and pg out of the bundler" but only lists `pg`.
- No security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy).
- `Lead.equipment` is `String` in DB, not an enum.
- Mobile menu has no active-link state.
- Equipment page "Get started with X" does not preselect equipment in the lead form.
- Lead form field ids are generic (`email`, `message`, `website`); fine with one form per page.
- Contact phone not validated as a US number (lead phone is) — inconsistent but possibly intended.
- `defaultMetadata.alternates.canonical = "/"`: any future page that forgets `buildMetadata()` will
  inherit a canonical pointing at the homepage.
- Sitemap has no `lastModified`; Organization JSON-LD has no logo/contact/sameAs.
- No image strategy in use yet (`next/image` not used anywhere; `images.formats` configured).
- README mentions folder `Hailix/` (typo) and Node 22.23.4 (local is Node 24.18.0).
- `tests/e2e` excluded from `tsc`, so e2e files are not typechecked.
- No CI workflow; `npm run check` is the only gate.

## 17. Security considerations

- Secrets: none committed. `.gitignore` excludes `.env` and `.env.*` (except `.env.example`), `*.pem`,
  `.vercel`. Only `NEXT_PUBLIC_*` vars reach the browser; secrets correctly have no prefix.
- Input handling: Zod validation on server for every endpoint; HTML email escapes all user input;
  JSON-LD escapes `<`. Plain-text email subject contains user name (acceptable).
- Abuse: honeypot only; **add rate limiting** (e.g. per-IP via an edge store) and optionally a
  CAPTCHA (Turnstile) before launch. No explicit request size limits.
- Headers: no security headers configured; `poweredByHeader: false` is set.
- PII: leads contain name/email/phone/MC/DOT. Privacy Policy is a placeholder; a real policy (and
  data retention/deletion approach) is required before collecting data in production.
- Logging: `console.error` may include Prisma/Resend error objects; avoid logging submitted PII in
  production log drains.
- Future portal: `/portal` disallowed in robots; auth not chosen; protect with `proxy.ts` (Next 16
  name for middleware) or layout-level checks when Module 2 starts.

## 18. Deployment readiness

| Area                     | Status                                                                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production build         | **Unverified** (`npm run build` not run; no `.next` production output). First thing to run.                                                                                                                                 |
| Vercel compatibility     | Likely compatible: standard Next app, Node runtime routes, `postinstall: prisma generate` (needs network on install; `prisma` and `dotenv` are devDependencies, which Vercel installs by default). No `vercel.json` needed. |
| Environment variables    | None set. `NEXT_PUBLIC_SITE_URL` must be set **before build** (inlined).                                                                                                                                                    |
| Database                 | No provider chosen, no migrations. Pooled `DATABASE_URL` + direct `DIRECT_URL` pattern ready (e.g. Neon/Supabase/Vercel Postgres). Run `prisma migrate deploy` against prod.                                                |
| Email                    | Resend account, verified sending domain, `EMAIL_FROM`, `CONTACT_EMAIL` needed.                                                                                                                                              |
| SEO                      | Plumbing ready; needs domain, OG image, real copy, Search Console.                                                                                                                                                          |
| Performance              | Fully static pages, bundled fonts, small client islands. Not measured (no Lighthouse run). No images yet.                                                                                                                   |
| Security                 | See §17: rate limiting + headers outstanding.                                                                                                                                                                               |
| Error handling / logging | Basic; no Sentry or log drain.                                                                                                                                                                                              |
| Domain / DNS / CI        | Not set up.                                                                                                                                                                                                                 |

Verdict: **technically close to deployable as a preview**, **not ready for public launch** (content,
legal pages, integrations, rate limiting, OG image, domain).

## 19. Completed work

- Next 16 / React 19 / TS 6 strict / Tailwind 4 project with ESLint, Prettier, Vitest, RTL,
  Playwright configured and passing.
- Layered architecture with documented conventions (`ARCHITECTURE.md`).
- Design tokens and shadcn-style primitives (Button, Input/Textarea/Select, Label, Accordion,
  DropdownMenu, Sheet) and 16 shared components.
- Responsive Navbar (desktop dropdowns + mobile Sheet) and Footer driven by config.
- All 13 public routes + 7 SSG equipment pages + reserved `/portal`.
- SEO: metadata builder, canonical URLs, OG/Twitter text, JSON-LD (Organization, BreadcrumbList,
  FAQPage), robots, sitemap, favicon.
- Lead and contact forms with shared Zod validation, honeypot, accessible errors and status.
- API routes, service layer with honest degradation (503/500), Resend email templates.
- Prisma 7 schema (unified Lead, NewsletterSubscriber; see §0e) with lazy adapter-based client.
- 20 unit tests + 4 e2e smoke tests; README, ARCHITECTURE, public asset READMEs, portal README.

## 20. Pending work

**Business inputs needed from HAULIX (blocking real content):** final logo and brand assets,
licensed truck photography, approved company story (About), real service copy per equipment,
pricing model, real onboarding process, FAQ answers, contact email/phone/address, social URLs,
legal Privacy Policy and Terms, production domain, real testimonials (with permission).

**Engineering:** fix K1–K8; production build verification; database provider + first migration;
Resend domain + env; rate limiting; security headers; OG image; analytics (GA4) + consent if
needed; Sentry or equivalent; newsletter UI (or remove the endpoint); per-field server errors;
equipment preselect from service pages; Resources/Blog content system (MDX or CMS) if wanted;
more tests (API, services, forms, a11y) and CI; Lighthouse/a11y pass; Vercel deployment.

## 21. Recommended next development phase and roadmap

Phases 0 (initialization) and 1 (technical foundation) are **done** and should not be redone.

### Phase 2 — Foundation hardening (recommended next)

- **Objective:** close the real defects found in this audit before building more on top.
- **Tasks:** K1 (Prisma env loading), K2 (`isEmailConfigured()` in services), K3 (contrast token),
  K4/K5 (server field errors, non-JSON responses), K6 (error/loading chrome, `global-error.tsx`),
  run `npm run build` and fix anything it reports; install Playwright Chromium and run e2e; add a
  GitHub Actions workflow running `npm run check` + build.
- **Dependencies:** none.
- **Deliverables:** small PR(s); green CI.
- **Completion criteria:** `npm run check`, `npm run build`, `npm run test:e2e` all pass locally and
  in CI.

### Phase 3 — Brand identity and design-system refinement

- **Objective:** turn the generic navy/blue starter into a distinctive HAULIX brand.
- **Tasks:** receive/approve logo (replace `Logo` + `icon.svg`, add apple-touch/manifest icons in
  `public/icons`), confirm palette (edit only `globals.css`), decide display typeface (self-host in
  `public/fonts` if not Geist), define image treatment, document tokens; add any missing primitives
  (e.g. Badge, Card, Tabs) only when pages need them; remove/keep unused variants deliberately.
- **Dependencies:** brand assets from the business.
- **Deliverables:** updated tokens, logo, favicon set, OG image template.
- **Completion criteria:** no temporary assets remain; contrast AA everywhere.

### Phase 4 — Public website content and page design

- **Objective:** replace placeholders with approved copy and richer, conversion-focused sections.
- **Tasks:** homepage (benefits, why HAULIX, equipment, process, FAQ teaser, imagery; add trust
  content only when factual), About, Pricing (real model), How It Works, FAQ, Contact details;
  deepen each of the 7 equipment pages (benefits, typical freight, process, FAQs, CTA with equipment
  preselected via query param); keep content in `src/content`.
- **Dependencies:** Phase 3 assets; business copy and pricing.
- **Deliverables:** finished pages, `next/image` photography.
- **Completion criteria:** no "placeholder"/"coming soon" text except Blog/Resources if deferred.

### Phase 5 — Forms and integrations go-live

- **Objective:** make lead capture real and reliable.
- **Tasks:** choose Postgres host, create first migration (`prisma migrate dev --name init`),
  configure Resend domain and env vars, rate limiting (+ optional Turnstile), optional confirmation
  email to the carrier, decide on newsletter (add UI in footer or remove), a minimal way for the team
  to view leads (Prisma Studio initially).
- **Dependencies:** Phase 2 (K1, K2); accounts with DB and email providers.
- **Deliverables:** working submissions stored and emailed in a preview environment.
- **Completion criteria:** a test lead and contact message arrive in the DB and inbox; abuse limits
  verified.

### Phase 6 — Legal, SEO and performance

- **Tasks:** professional Privacy Policy and Terms; OG image(s) (`opengraph-image`); Organization
  schema with logo/contact; Service schema per equipment page; sitemap `lastModified`; security
  headers in `next.config.ts`; analytics with consent if required; Lighthouse ≥90 targets; a11y audit.
- **Completion criteria:** Lighthouse/axe pass; rich results test passes; legal pages approved.

### Phase 7 — Testing and QA expansion

- **Tasks:** unit tests for services/API (mock Prisma/Resend), email escaping, `usePostJson`, form
  submission flows; e2e for navigation (desktop + mobile), form validation and success/503 paths;
  axe checks in Playwright; coverage reporting.
- **Completion criteria:** critical paths covered and enforced in CI.

### Phase 8 — Production deployment

- **Tasks:** Vercel project from GitHub, env vars (set `NEXT_PUBLIC_SITE_URL` before build), domain
  - DNS, `prisma migrate deploy`, Resend DNS, Sentry/log drain, Search Console + sitemap submission,
    launch checklist from README.
- **Completion criteria:** production URL live, forms verified end-to-end, monitoring active.

### Optional — Resources & Blog

MDX or headless CMS, post routes (`/blog/[slug]`), sitemap entries, Article schema. Only when the
business commits to content.

### Future Module 2 — Carrier Portal (do not start until Module 1 launches)

Decide auth, add a `/portal` route-group layout without marketing chrome, protect with `proxy.ts`,
add Prisma models, link converted leads to accounts, flip `siteConfig.portal.enabled`.

---

## What a fresh session must know (quick reference)

1. **Module 1 only.** Never build portal features; `/portal` stays a `noindex` placeholder and
   "Carrier Login" stays disabled until Module 2 is explicitly started.
2. **Next.js 16.4.6** — read `node_modules/next/dist/docs/` before writing Next code (`AGENTS.md`).
   `params` is a Promise; middleware is `proxy.ts`. **Prisma 7**: URLs in `prisma.config.ts`,
   `prisma-client` generator → `src/generated/prisma` (import from `@/generated/prisma/client`),
   driver adapter `PrismaPg`. **Zod 4**, **Tailwind 4** (CSS-first, no tailwind config file).
3. **Tokens only in `src/app/globals.css`.** No raw hex in components; use `navy-*`, `brand-*`,
   `surface`, `foreground`, `muted-foreground`, `subtle-foreground`, `on-dark-muted`, `border`,
   `primary`, `destructive`, `shadow-soft/lift`, `bg-hero-gradient`.
4. **Copy in `src/content`, settings in `src/config`.** Equipment list drives nav, footer, sitemap,
   pages, form and validation — add a slug in `equipmentSlugs` + an entry in `equipmentServices`.
5. **Never invent facts** (stats, testimonials, certifications, prices, contact details).
6. **Server Components by default**; `"use client"` only for interactivity, kept leaf-level.
7. **Every page:** `export const metadata = buildMetadata({...})`; inner pages use `PageHeader`
   (single h1 + breadcrumbs); marketing pages live under `src/app/(marketing)/`.
8. **New form feature:** Zod schema in `src/validations` → service in `src/services` (return
   `ServiceResult`, never throw) → thin route in `src/app/api` using `parseBody` /
   `respondToServiceResult` → client form with RHF + `zodResolver` + `usePostJson` + `FormStatus`.
9. **Nothing is configured** (DB, email, domain). Forms return 503 by design until `DATABASE_URL`
   is set; the database is the source of truth and email is only a notification (§0d).
10. Gate before committing: `npm run check` (typecheck, lint, format:check, test). Prettier sorts
    Tailwind classes. Files kebab-case, components PascalCase, `@/` imports, `import type`.
11. Next step: **Phase 2 foundation hardening** (K1–K8, verify `npm run build`, e2e, CI), then brand
    assets and real content.
