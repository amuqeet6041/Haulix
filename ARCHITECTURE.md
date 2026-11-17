# HAULIX Architecture

HAULIX Module 1 is a **modular monolith**: one Next.js (App Router) application with clear layers
and no microservices. Module 2 (Carrier Portal) will live in the same codebase under `/portal`.

## 1. Layers

| #   | Layer                | Where                                                  | Responsibility                              |
| --- | -------------------- | ------------------------------------------------------ | ------------------------------------------- |
| 1   | Presentation         | `src/components/layout`, `home`, `services`, `pricing` | Page sections and site chrome               |
| 2   | Reusable UI          | `src/components/ui`, `src/components/shared`           | Primitives and generic building blocks      |
| 3   | Page / Route         | `src/app`                                              | Routing, metadata, composing components     |
| 4   | Application Services | `src/services`                                         | Business logic (what happens to a lead)     |
| 5   | Validation           | `src/validations`, `src/lib/validations`               | Zod schemas, shared by forms and API routes |
| 6   | Data Access          | `src/lib/prisma.ts`, `prisma/`                         | Database client and schema                  |
| 7   | Configuration        | `src/config`, `src/content`, `.env.example`            | Site settings, navigation, editable copy    |

**Dependency direction:** routes → components/services → validations/lib → config/content.
Components never import services or the database. Services never import components.

## 2. Directory guide

- `src/app/(marketing)` — all public pages. The `(marketing)` route group adds the shared navbar and
  footer without changing URLs.
- `src/app/portal` — reserved for Module 2 (see section 8).
- `src/app/api/{leads,contact,newsletter}` — thin route handlers: parse + validate, call a service,
  return JSON.
- `src/app/robots.ts`, `sitemap.ts`, `icon.svg` — SEO and favicon conventions.
- `src/components/ui` — shadcn/ui-style primitives (button, input/select/textarea, label, accordion,
  dropdown-menu, sheet) built on Radix UI and `class-variance-authority`.
- `src/components/shared` — Container, SectionHeading, PrimaryButton, SecondaryButton, TrustBadge,
  FeatureCard, CtaSection, Breadcrumbs, FormField, FaqAccordion, LoadingState, EmptyState, PageHeader,
  Logo, JsonLd, Reveal.
- `src/components/layout` — Navbar (client) and Footer (server).
- `src/components/{services,pricing,home,forms}` — ServiceCard, PricingCard, TestimonialCard,
  LeadForm, ContactForm.
- `src/config` — `site.ts` (name, URL, contact, social, portal flag), `navigation.ts`, `metadata.ts`.
- `src/content` — editable copy as typed data: services, faqs, pricing, testimonials (empty),
  process. Edit here, not in components.
- `src/lib` — `utils.ts`, `seo.ts` (metadata + JSON-LD builders), `prisma.ts`, `api-response.ts`,
  `email/` (Resend client and templates), `validations/primitives.ts`.
- `src/services` — `lead.service.ts` (both lead types), `newsletter.service.ts`, `email.service.ts`.
- `src/validations` — `lead.ts` (`carrierInquirySchema`, `contactSchema`), `newsletter.ts` (Zod
  schemas and inferred types).
- `src/hooks` — `use-post-json.ts`. `src/types` — shared types.
- `prisma/schema.prisma` — unified `Lead` (types `CARRIER_INQUIRY`, `CONTACT`), `NewsletterSubscriber`.
- `tests/unit`, `tests/e2e` — Vitest and Playwright.

## 3. Component architecture

- **Server Components by default.** Only these are client components (`"use client"`):
  `Navbar` (active link, dropdowns, mobile sheet), `FaqAccordion`, `Reveal` (animation),
  `LeadForm`, `ContactForm`, and the `ui/` primitives that use Radix state (accordion,
  dropdown-menu, sheet). Pages themselves stay on the server.
- **Design tokens** live only in `src/app/globals.css` (`:root` variables mapped through `@theme
inline`). Components use semantic classes such as `bg-navy-900`, `text-brand-600`,
  `text-muted-foreground`. To rebrand, edit the variables.
- **Variants** use `class-variance-authority`; class merging uses `cn()` from `src/lib/utils.ts`.
- **Motion** is limited to `Reveal` and respects `prefers-reduced-motion`.
- **Fonts:** Geist Sans/Mono from the `geist` package (bundled; no network fetch at build).

## 4. Route architecture

| Route                                                                                             | File                                                     | Rendering      |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------- |
| `/`                                                                                               | `(marketing)/page.tsx`                                   | Static         |
| `/about`, `/pricing`, `/how-it-works`, `/faq`, `/resources`, `/blog`, `/privacy-policy`, `/terms` | `(marketing)/<name>/page.tsx`                            | Static         |
| `/services`                                                                                       | `(marketing)/services/page.tsx`                          | Static         |
| `/services/[equipment]`                                                                           | `(marketing)/services/[equipment]/page.tsx`              | SSG (7 pages)  |
| `/contact`, `/get-started`                                                                        | `(marketing)/<name>/page.tsx` (server page, client form) | Static         |
| `/portal`                                                                                         | `portal/page.tsx` (placeholder, `noindex`)               | Static         |
| `/api/leads`, `/api/contact`, `/api/newsletter`                                                   | `api/<name>/route.ts`                                    | Dynamic (Node) |

`/services/[equipment]` uses `generateStaticParams` over `content/services.ts` and
`dynamicParams = false`, so unknown slugs return 404. Adding an equipment type means adding one
entry to `equipmentServices` (and its slug to `equipmentSlugs`); the page, nav, footer, sitemap, lead
form and validation all update automatically.

## 5. SEO

- Root layout sets `metadataBase`, title template, Open Graph and Twitter defaults
  (`src/config/metadata.ts`).
- Each page calls `buildMetadata({ title, description, path })` (`src/lib/seo.ts`), which sets the
  canonical URL, Open Graph and Twitter data.
- Structured data: Organization (root layout), BreadcrumbList (all inner pages), FAQPage (`/faq`).
- `robots.ts` disallows `/api/` and `/portal/`; `sitemap.ts` lists all public routes.
- The site URL comes from `NEXT_PUBLIC_SITE_URL` (fallback `http://localhost:3000`). No production
  domain is hard-coded.

## 6. Data flow and form validation

```
Browser form (React Hook Form + zodResolver(carrierInquirySchema))
   │  client-side validation, inline field errors
   ▼
usePostJson → POST /api/leads
   │
   ▼
route.ts: parseBody(request, carrierInquirySchema)  ← same schema, server-side re-validation
   │  422 with fieldErrors if invalid
   │  honeypot filled? → silent 200, no work
   ▼
lead.service.submitCarrierInquiry(data)   (contact form: /api/contact → submitContactMessage)
   1. no DATABASE_URL            → not_configured (503), nothing sent
   2. storeLead → Prisma Lead    → write failed: failed (500), no email sent
   3. sendLeadNotification → Resend (only if RESEND_API_KEY + CONTACT_EMAIL set)
        skipped or failed        → warning with the record id; submission still ok
   ▼
ServiceResult → respondToServiceResult → JSON { ok, message }
   ok only once stored · 503 if no database · 500 if the database write failed
   ▼
usePostJson → FormStatus message; 422 fieldErrors mapped onto fields (first one focused);
              non-JSON responses shown as a server error
```

- **Database is the source of truth.** Email is a notification, never a substitute for storage.
- **Unified Lead model.** Both forms write to one `Lead` table so the team works a single queue.
  `type` comes from the endpoint (`/api/leads` = `CARRIER_INQUIRY`, `/api/contact` = `CONTACT`),
  never from the client.

  | Field group    | Columns                                                                                                                                      | CARRIER_INQUIRY                                   | CONTACT                                                         |
  | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------- |
  | Contact        | `fullName`, `email`, `phone`, `companyName`, `mcNumber`, `dotNumber`                                                                         | name, email, phone required; rest optional        | name, email required; phone (US) and company optional           |
  | Dispatch       | `equipment` (slug), `fleetSize`, `preferredLanes`                                                                                            | equipment and fleet size required; lanes optional | equipment and fleet size optional                               |
  | Inquiry        | `inquiryType` (enum), `subject`, `message`                                                                                                   | message optional                                  | inquiry type and message (10+ chars) required; subject optional |
  | Server-managed | `type`, `status`, `sourcePage`, `submissionId` (unique), `ipHash`, `userAgent`, `notifiedAt`, `confirmationSentAt`, `createdAt`, `updatedAt` | never accepted from the client                    | never accepted from the client                                  |
  | Administration | `notes`, `contactedAt`                                                                                                                       | future admin use                                  | future admin use                                                |

  The database only enforces what holds for every lead; per-type required fields are enforced by
  Zod. `LeadStatus`: `NEW` (default) → `CONTACTED` → `QUALIFIED` → `ONBOARDED` or `REJECTED`
  (closed), plus `SPAM`. Indexes: `(status, createdAt)`, `(type, createdAt)`, `email`,
  `(ipHash, createdAt)`. Column lengths match `leadLimits` in `src/lib/validations/primitives.ts`.
  `sourcePage`, `ipHash`, `userAgent`, `notifiedAt` and `confirmationSentAt` are not populated
  yet; later Phase 4 steps set them on the server.

- **Logging:** `src/lib/log.ts` logs only an error's name and code (and the record id), never
  provider messages or submitted values, which can contain personal data.

- **One schema, two places.** `src/validations/*` is imported by both the form and the route, so
  client and server rules cannot drift. Types are inferred (`z.input` for form fields, `z.output`
  for validated data).
- **Shared primitives** (name, email, US phone, optional text, MC/DOT numbers, honeypot) live in
  `src/lib/validations/primitives.ts`.
- **Spam protection:** a hidden honeypot field. Rate limiting is **not** implemented yet (see
  section 9).

## 7. Backend integration strategy

- **Database:** Prisma 7 with the `prisma-client` generator (output `src/generated/prisma`, git-ignored,
  regenerated by `postinstall`) and the `@prisma/adapter-pg` driver adapter. The client is created
  lazily in `getPrisma()`, so importing it never connects. The site builds and runs without
  PostgreSQL.
- **Connection URLs** are read in `prisma.config.ts` (Prisma 7 no longer reads them from
  `schema.prisma`). `DIRECT_URL` (migrations) is preferred, then `DATABASE_URL`. The config loads
  `.env.local` then `.env` via `prisma/env.ts` (real environment variables win) and sets no
  datasource when neither URL exists, so CLI commands fail clearly instead of using a placeholder.
- **Email:** Resend client is also lazy. Templates escape all user input. `EMAIL_FROM` must be a
  verified sender in production.
- **Failure behaviour:** services never throw to routes; they return a `ServiceResult` so the API can
  answer honestly (503 no database, 500 database write failed) and never report a lead as received
  unless it is stored.
- **Adding a feature:** add a Zod schema in `src/validations`, a service in `src/services`, a thin
  route in `src/app/api`, and a form component in `src/components/forms`.

## 8. Future Carrier Portal (Module 2) integration

Prepared now, without building any portal features:

- `/portal` is reserved (`src/app/portal/README.md` + a `noindex` placeholder page).
- Navbar **Carrier Login** is a disabled "Soon" item controlled by `siteConfig.portal.enabled`.
  When `/portal/login` exists, set it to `true`; it links to `siteConfig.portal.loginPath`.
- `robots.txt` already disallows `/portal/`.
- The portal can use its own route-group layout (no marketing chrome) because marketing chrome
  lives in `(marketing)/layout.tsx`, not the root layout.
- Reuse: `components/ui`, design tokens, `lib/prisma.ts`, `lib/email`, `lib/api-response.ts`.
- Data: add portal models (User, Truck, Load, Document, ...) to `prisma/schema.prisma`; Module 1
  tables are unaffected. A converted lead can later link to a portal account.
- Authentication is **not chosen yet**. Decide it when Module 2 starts and protect `/portal/*` with
  Next.js `proxy.ts` (formerly middleware) or per-layout checks.

## 9. Known gaps (intentional, for later steps)

- No rate limiting or CAPTCHA on API routes (honeypot only).
- No Open Graph image yet (add `opengraph-image` or a file in `public/images`).
- Analytics (`NEXT_PUBLIC_GA_MEASUREMENT_ID`) and Sentry (`SENTRY_DSN`) are reserved env vars only.
- No database migrations are committed; run `prisma migrate dev` when a database exists.
- The Prisma client output is generated on install, not committed.
- Legal pages, About copy, pricing, contact details, social links and photography are placeholders.

## 10. Coding conventions

- TypeScript strict; no `any` (ESLint errors on it); type-only imports use `import type`.
- Server Components first; add `"use client"` only for state, effects, browser APIs or Radix
  interactivity, and keep client components small and leaf-level.
- No raw hex colors in components; use design tokens. Add new colors in `globals.css`.
- Copy lives in `src/content`; settings in `src/config`; components stay presentational.
- Business logic goes in `src/services`, never in components or route handlers.
- One `<h1>` per page (rendered by `PageHeader` or the hero). Use semantic landmarks (`header`,
  `nav`, `main`, `footer`), labelled form fields, and visible focus styles.
- Handle loading, empty and error states (`loading.tsx`, `error.tsx`, `EmptyState`, `FormStatus`).
- Files are `kebab-case`; components `PascalCase`; services `<name>.service.ts`.
- Imports use the `@/` alias, grouped: external, internal alias, relative.
- Run `npm run check` before committing. Prettier (with the Tailwind class-sorting plugin) is the
  formatting authority.
