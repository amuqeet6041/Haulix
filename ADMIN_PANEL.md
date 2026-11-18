# HAULIX Admin Panel

This document describes what is **actually implemented** in the admin panel (Phase 4.9, Steps 0 to
10). Where something is not built, it says so under [Known limitations](#15-known-limitations).

The admin panel is for HAULIX staff. It lives at `/admin` and `/api/admin`, inside the same Next.js
application as the public website. It does not touch `/portal` (reserved for the future carrier
portal) or the public pages.

## Contents

1. [Architecture](#1-architecture)
2. [Authentication and authorization](#2-authentication-and-authorization)
3. [Roles and permissions](#3-roles-and-permissions)
4. [Lead management workflow](#4-lead-management-workflow)
5. [Lead status transitions](#5-lead-status-transitions)
6. [Internal notes and ownership](#6-internal-notes-and-ownership)
7. [Activity history](#7-activity-history)
8. [Account and session management](#8-account-and-session-management)
9. [Development environment setup](#9-development-environment-setup)
10. [Environment variables](#10-environment-variables-names-only)
11. [Testing](#11-testing)
12. [Database setup and safe seeding](#12-database-setup-and-safe-seeding)
13. [Deployment](#13-deployment)
14. [Production safety rules](#14-production-safety-rules)
15. [Known limitations](#15-known-limitations)

## 1. Architecture

Every request to private admin data passes through these layers. Each one checks on its own, so
removing one never opens access.

| Layer      | File(s)                                      | What it does                                                                                                        |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Proxy      | `src/proxy.ts`                               | Early, cookie-presence check for `/admin`, `/admin/*`, `/api/admin/*`. Never the authority.                         |
| Page guard | `src/lib/admin-page.ts` (`requireAdminPage`) | Verifies the session on the server for every page; redirects to `/admin/login` otherwise.                           |
| API guard  | `src/lib/admin-guard.ts` (`withAdmin`)       | Session, role, allowlist, ban, permission, same-origin check for writes, no-store headers, safe 500.                |
| Service    | `src/services/admin-*.service.ts`            | `assertAdmin(admin, permission)` first, then Prisma with explicit `select`s. Never throws except for access errors. |
| Database   | `prisma/schema.prisma`                       | Lead, LeadNote, LeadActivity and the Better Auth tables.                                                            |

Folder map:

```
src/proxy.ts                         early redirect / 401 for admin URLs
src/app/admin/login                  sign-in page (outside the dashboard shell)
src/app/admin/(protected)/           dashboard, leads, lead detail, account (inside the shell)
src/app/api/admin/                   admin API routes (all use withAdmin)
src/app/api/auth/[...all]            Better Auth (sign-in, sign-out, change-password, ...)
src/components/admin/                admin-only components (shell, tables, forms, panels)
src/components/ui/                   shared primitives (Badge, Pagination, Toast, ConfirmDialog, ...)
src/services/admin-lead.service.ts   leads: list, detail, dashboard stats, status update
src/services/admin-note.service.ts   notes: add, edit, delete
src/services/admin-account.service.ts  account profile, sessions
src/validations/admin-*.ts           Zod schemas (shared by browser and server)
src/lib/admin-api.ts                 JSON response and input helpers for admin routes
src/lib/admin-lead-url.ts            URLs for the leads list (filters, sort, page)
src/lib/lead-timeline.ts             builds the activity timeline for a lead
src/content/lead-status.ts           status/type labels, order and badge tones
```

Pages and routes:

| Route                                  | Method(s)     | Permission                    | Purpose                                      |
| -------------------------------------- | ------------- | ----------------------------- | -------------------------------------------- |
| `/admin/login`                         | page          | public                        | Email and password sign-in                   |
| `/admin`                               | page          | admin                         | Dashboard: counts by status and type, recent |
| `/admin/leads`                         | page          | `lead:list`                   | Searchable, filterable, sortable lead list   |
| `/admin/leads/[id]`                    | page          | `lead:read`                   | Lead detail, status control, notes, activity |
| `/admin/account`                       | page          | admin (own account)           | Profile, password, sessions                  |
| `/api/admin/me`                        | GET           | admin                         | Name and email of the signed-in admin        |
| `/api/admin/stats`                     | GET           | `lead:list`                   | Dashboard statistics                         |
| `/api/admin/leads`                     | GET           | `lead:list`                   | Paginated lead list                          |
| `/api/admin/leads/[id]`                | GET           | `lead:read`                   | One lead with notes and activity             |
| `/api/admin/leads/[id]/status`         | PATCH         | `lead:update-status`          | Change status                                |
| `/api/admin/leads/[id]/notes`          | POST          | `leadNote:create`             | Add a note                                   |
| `/api/admin/leads/[id]/notes/[noteId]` | PATCH, DELETE | `leadNote:update` / `:delete` | Edit or delete your own note                 |
| `/api/admin/account/profile`           | PATCH         | admin (own account)           | Change your display name                     |
| `/api/admin/account/sessions`          | GET           | admin (own account)           | List your sessions (no tokens)               |
| `/api/admin/account/sessions/[id]`     | DELETE        | admin (own account)           | End one of your other sessions               |

Every admin API response is JSON with `ok`, and carries `Cache-Control: no-store`, `Pragma:
no-cache` and `X-Robots-Tag: noindex, nofollow`. Errors have a `code` (`unauthenticated`,
`forbidden`, `not_found`, `conflict`, `validation_failed`, `invalid_request`, `too_large`,
`unavailable`, `server_error`) and a generic `message`; database or internal details are never
returned. `next.config.ts` also sends `frame-ancestors 'none'`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff` and `no-store` for everything under
`/admin` and `/api/admin` (the public website is not affected).

The pages are server components that read data on the server; the browser never fetches lead data
itself. Only small interactive parts are client components: the shell, the status control, the notes
panel, the account forms and the dialogs and toasts.

## 2. Authentication and authorization

Authentication is [Better Auth](https://www.better-auth.com) (self-hosted, pinned to 1.7.16) with
the Prisma adapter, configured in `src/lib/auth.ts`.

- **Sign-in:** email and password only. Public registration is disabled (`disableSignUp`). Passwords
  are 6 to 128 characters (length is the only rule, the owner's choice). Hashing is Better Auth's.
- **Accounts:** created only by the owner, with `npm run admin:create` (see
  [section 12](#12-database-setup-and-safe-seeding)).
- **Allowlist:** `ADMIN_EMAILS` (comma separated). An admin account can be created, can sign in and
  can use the panel only while its email is in this list. It is checked at sign-in, when creating
  the account and on **every request**, so removing an email takes effect immediately.
- **Sessions:** 12 hours, refreshed hourly. Cookie prefix `haulix`; the cookies are `Secure` in
  production.
- **Rate limits** (stored in the database, so they hold across server instances): 60 requests per
  minute in general, and **5 per 15 minutes** for `/sign-in/email` and for `/change-password`.
- **CSRF / origin:** Better Auth checks the origin of its own endpoints. Every state-changing admin
  API call (`withAdmin`) also runs `checkOrigin`, and a request from another origin, or with no
  origin information, is refused with 403. Outside production the request's own origin is also
  trusted, so `http://localhost:PORT` works.
- **Disabled on purpose:** change email, delete account, two-factor sign-in (postponed; its tables
  are dormant), public password reset, impersonation, and creating users or changing roles through
  the API.

An admin request is allowed only if **all** of these hold (`evaluateAdminSession`): a valid, unexpired
session; role `admin`; email in `ADMIN_EMAILS`; not banned; not an impersonation session; and the
permission the endpoint needs. Failures answer 401 (not signed in), 403 (refused) or 503 (auth
unavailable). A caller is told only the coarse reason, never which rule failed.

Services take an `AdminContext` that only `src/lib/admin-guard.ts` can create (a branded, frozen
object). `assertAdmin(context, permission)` rejects forged objects and re-checks the allowlist, so a
service cannot be reached with an invented or stale identity.

## 3. Roles and permissions

Defined in `src/lib/auth-roles.ts` and enforced in every route and service.

| Resource   | Actions                         | `admin` | `carrier` |
| ---------- | ------------------------------- | :-----: | :-------: |
| `lead`     | `list`, `read`, `update-status` |   yes   |    no     |
| `leadNote` | `create`, `update`, `delete`    |   yes   |    no     |
| `user`     | `list`, `get`, `ban`            |   yes   |    no     |
| `session`  | `list`, `revoke`                |   yes   |    no     |

`carrier` is reserved for the future carrier portal and has no permissions. Account-page routes
need only a valid admin; they act on the caller's own account and never accept a user id.

## 4. Lead management workflow

Leads come from the public forms (`/get-started` creates a carrier inquiry, `/contact` creates a
contact message). Staff then:

1. See totals and recent leads on the **dashboard** (`/admin`). The total counts every status,
   including Rejected and Spam.
2. Find a lead in the **list** (`/admin/leads`): search (name, email, company, phone, MC, DOT,
   subject; case-insensitive, `%` and `_` match literally), filter by type and status, sort by
   lead, type, status or date, and choose 10, 25 or 50 rows per page. Everything is in the URL, so
   pages can be bookmarked. A page past the end redirects to page 1 of the same search.
3. Open the **detail page**: contact details, carrier details (carrier inquiries only), equipment,
   message, status control, notes, and the activity timeline.
4. **Change the status** and **add notes** as described below.

Only the lead's status and its notes can be changed from the panel. Contact details, company,
equipment and message are read-only.

## 5. Lead status transitions

The six statuses, in workflow order (`src/content/lead-status.ts`): **New, Contacted, Qualified,
Onboarded, Rejected, Spam**. **Any status can change to any other** (the owner chose this over a
strict order).

- The control needs an explicit **Update status** click and a **confirmation dialog**.
- `PATCH /api/admin/leads/[id]/status` runs in **one transaction**: it reads the lead, updates it
  only if it still has the status that was read (compare-and-set), and writes the activity entry.
- Choosing the status the lead already has changes nothing and logs nothing.
- If someone else changed the lead first, the answer is **409**, and the page reloads the lead.
- `contactedAt` is set the first time a lead becomes Contacted and is never cleared or changed.
- After a change the dashboard, the list and the detail page show it (they read live data, and the
  route also calls `revalidatePath`).

## 6. Internal notes and ownership

Notes are private to admins (`LeadNote`, up to 5,000 characters, trimmed, multi-line).

- **Add:** any admin can add a note to a lead. A second identical note from the same admin within 15
  seconds is treated as a double submit and returns the first one.
- **Edit and delete: only the author.** Ownership is enforced in the service and again in the
  database filter (`authorId` is part of the write's `where`), not just in the UI. The UI shows Edit
  and Delete only on your own notes.
- **Legacy notes** (imported from the old `Lead.notes` field, `authorId` is null) are shown
  with the label "Former team member" and can be neither edited nor deleted by anyone. The old
  `Lead.notes` column itself is kept as it was and never read or changed.
- A note is always looked up by its own id **and** its lead's id, so a note id from another lead is
  "not found" (no cross-lead access).
- An edit sends the `updatedAt` the admin saw; if the note changed since, the edit is refused (409)
  instead of overwriting. Edited notes show an "edited" marker with the time. The author and
  creation time never change.
- Deleting asks for confirmation. A failed save or delete keeps the note and the typed text.

## 7. Activity history

`LeadActivity` is an insert-only audit trail written in the same transaction as the change it
records:

| Action           | Written when          | Stored                                            |
| ---------------- | --------------------- | ------------------------------------------------- |
| `STATUS_CHANGED` | a status changes      | actor, lead, previous status, new status          |
| `NOTE_ADDED`     | a note is added       | actor, lead, note id                              |
| `NOTE_EDITED`    | a note's text changes | actor, lead, note id, previous text in `metadata` |
| `NOTE_DELETED`   | a note is deleted     | actor, lead, note id, previous text in `metadata` |

The previous text of an edited or deleted note is kept in `metadata` for audit and investigation. It
is **never selected by the read services and never shown** in the timeline (the UI shows only "Note
edited" or "Note deleted" with who and when). The timeline on the detail page (`lead-timeline.ts`)
also shows system events: submission, the team and submitter emails (an email that was never sent
shows as "was not sent"), and first contact.

## 8. Account and session management

`/admin/account` manages the signed-in admin's own account, using Better Auth throughout.

- **Profile:** the display name can be changed (`PATCH /api/admin/account/profile`, strict body:
  `name` only, 1 to 100 characters, explicit Save). Email and role are shown but cannot be changed:
  Better Auth's change-email stays disabled (it needs an email-verification flow that is not set up)
  and roles can never be changed by the account holder.
- **Password:** the browser calls Better Auth's `/api/auth/change-password` directly. Better Auth
  verifies the current password, hashes the new one, and (here) signs out every other device. The
  form checks length, that the confirmation matches, and that the new password differs; the
  confirmation is never sent. Passwords are never sent to our own API, stored or logged. The endpoint
  is limited to 5 attempts per 15 minutes.
- **Sessions:** `GET /api/admin/account/sessions` lists your active sessions (device label such as
  "Chrome on Windows", signed-in time, last active, and which one is this device). Better Auth's own
  list endpoint returns session **tokens**, so the browser never calls it; our route returns an opaque
  session id only, and no tokens or IP addresses. `DELETE /api/admin/account/sessions/[id]` ends
  another of your sessions: the id is looked up in **your own** sessions, so someone else's id is a
  404, and the current session is refused (use Sign out).
- **Sign out everywhere:** after an explanatory confirmation, the browser calls Better Auth's
  `/api/auth/revoke-sessions`, which deletes every session of the account, this one included, then
  goes to `/admin/login`. The browser may keep the old cookie until it expires, but it no longer
  matches any session, so every page and API refuses it.
- There is no "forgot password" flow. To reset a password, the owner runs
  `npm run admin:create -- --email <email> --reset-password`.

## 9. Development environment setup

Requirements: Node.js 20.9 or newer, npm, and a PostgreSQL database (Neon).

```bash
npm install                 # also runs prisma generate
cp .env.example .env.local   # then fill in the values (see section 10)
npm run dev                 # http://localhost:3000
```

**Use a separate Neon branch for development.** Production and development must never share a
database. Create a branch from `main` in the Neon console (or `neon branches create`), then put that
branch's pooled connection string in `DATABASE_URL` and the direct (unpooled) one in `DIRECT_URL` in
`.env.local`. `.env.local` and any backup of it (`.env.*`) are git-ignored; never commit them.
A dev branch is a copy of production at the time it was created, so it can contain real customer
data: delete or anonymize any real leads on it, then use the seed data below.

After restarting `.env.local` changes, **restart `npm run dev`**: a running server keeps the database
connection it opened at start.

Locally, a submitted public form still sends real emails through Resend if `RESEND_API_KEY` is set.

## 10. Environment variables (names only)

Set in `.env.local` locally and in the hosting dashboard for production. Never commit values.

| Variable                                                                                  | Needed for                                                                |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                            | PostgreSQL connection used by the app (Neon pooled string)                |
| `DIRECT_URL`                                                                              | Direct connection used by Prisma migrations                               |
| `BETTER_AUTH_SECRET`                                                                      | Signs Better Auth data (at least 32 random characters)                    |
| `BETTER_AUTH_URL`                                                                         | The site's public URL (the origin Better Auth trusts)                     |
| `ADMIN_EMAILS`                                                                            | Comma-separated emails allowed to be admins                               |
| `NEXT_PUBLIC_SITE_URL`                                                                    | Canonical site URL (also trusted as an origin)                            |
| `IP_HASH_SECRET`                                                                          | Keyed hash for abuse limits on the public forms                           |
| `RESEND_API_KEY`, `FROM_EMAIL` (or `EMAIL_FROM`), `CONTACT_EMAIL`                         | Lead notification and confirmation emails                                 |
| `NEXT_PUBLIC_TURNSTILE_ENABLED`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Optional bot check on public forms (off by default)                       |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `SENTRY_DSN`                                             | Reserved, not wired up                                                    |
| `PRODUCTION_DATABASE_HOSTS`                                                               | Optional: extra database hosts the seed script must refuse                |
| `ADMIN_PASSWORD`                                                                          | Optional: lets `admin:create` run without a prompt (avoid; shell history) |

`.env.example` documents each one. Only `NEXT_PUBLIC_*` values reach the browser.

## 11. Testing

```bash
npm run check        # typecheck + lint + format check + all unit tests
npm run test         # unit and component tests (Vitest)
npm run build        # production build (also type-checks the routes)
npx vitest run tests/unit/admin-notes-routes.test.ts   # one file
```

Tests live in `tests/unit`. The important patterns:

- **Real Better Auth, in memory.** `tests/helpers/admin-auth.ts` builds the real auth configuration
  on Better Auth's in-memory adapter, with real sign-ins and a cookie jar. The route tests use it,
  so 401/403, banned admins, removed allowlist entries, forged cookies, cross-origin writes, session
  revocation and password changes are exercised end to end. Only the lead database is mocked.
- **Access-control audit** (`admin-access-audit.test.ts`): reads the source tree and fails if an
  admin route or page is added without a guard, if a service function does not authorize first, or
  if the proxy or headers change.
- **Consistency tests** run the real services against a small in-memory fake of the database to
  check that status changes, notes and activity agree across the dashboard, list and detail views.
- Component tests use React Testing Library with `user-event`.

The Playwright browser tests (`npm run test:e2e`) cover the public site only; they have not been
extended to the admin panel.

## 12. Database setup and safe seeding

Schema: `prisma/schema.prisma`. Two migrations exist: `20261117192326_init` (leads) and
`20261118052526_add_admin_auth` (Better Auth tables, `LeadNote`, `LeadActivity`). **Steps 2 to 10
added no migrations.**

```bash
npx prisma migrate deploy    # apply existing migrations (use for a new dev or production database)
npm run db:migrate           # create a NEW migration while developing (dev database only)
```

Never apply a migration to production without checking it first.

**Create an admin** (needs `BETTER_AUTH_SECRET` and the email in `ADMIN_EMAILS`):

```bash
npm run admin:create -- --email you@yourdomain.com --name "Your Name"
npm run admin:create -- --email you@yourdomain.com --reset-password
```

The password is typed at a hidden prompt, is never printed or logged, and the account is always the
`admin` role for an allowlisted email.

**Seed fake leads for development:**

```bash
npm run db:seed-dev                  # adds 40 fake leads
npm run db:seed-dev -- --count 60
npm run db:seed-dev -- --reset       # removes only the fake leads
```

The fake leads use `@example.invalid` emails and a `seed-` id prefix, and **no emails are sent**.
The script **refuses to run** against the production database endpoint (or any host in
`PRODUCTION_DATABASE_HOSTS`), when `NODE_ENV=production`, or on Vercel. `--reset` deletes only rows
whose `submissionId` starts with `seed-`.

## 13. Deployment

The site is deployed on Vercel from the `main` branch; pushing to `main` can start a production
deployment. Before relying on the admin panel in production:

1. Set the environment variables from [section 10](#10-environment-variables-names-only) in Vercel
   (`BETTER_AUTH_URL` must be the real public URL, with the right scheme and host).
2. Make sure the production database has both migrations applied.
3. Create the first admin deliberately (see below), and keep `ADMIN_EMAILS` limited to real staff.
4. The admin area sends its own security headers (`next.config.ts`); keep them if a CDN or proxy is
   added in front.
5. Sessions and rate limits are stored in the database, so they work across serverless instances.

Creating the production admin means running `admin:create` with `DATABASE_URL` pointing at
production. Do that on purpose, once, from a trusted machine, and restore `.env.local` to the dev
branch straight afterwards.

## 14. Production safety rules

- Develop and test on a **Neon dev branch**, never on the production database. Before any script,
  check which database `.env.local` points to (compare the endpoint id only; never paste or print
  connection strings).
- Never run the seed script, destructive scripts or experiments against production. The seed refuses
  production, but do not rely on that alone.
- Never commit `.env.local`, backups of it, passwords or tokens. `.env.*` is git-ignored, except
  `.env.example`.
- Do not apply migrations to production without review and a backup or restore point (Neon branches
  make this cheap).
- Keep `ADMIN_EMAILS` short. Removing an email revokes admin access on the next request.
- Do not log lead data. Logging in services uses only the error name and code.
- If a session may be exposed, use Account > Sign out everywhere, then change the password.

## 15. Known limitations

- **No two-factor sign-in** (postponed by decision; the tables exist but the feature is off).
- **No email change and no self-service password reset**; both need an email-verification flow that
  is not set up. Resetting a password is an owner task (`admin:create --reset-password`).
- **No per-admin write rate limit.** Password attempts are limited by Better Auth; note and status
  writes rely on the admin being trusted and signed in.
- **Search is a "contains" match without a database index.** That is fine for thousands of leads;
  add indexes if the table grows far beyond that.
- **Deleted and edited note text** is kept in `LeadActivity.metadata` for audit (never shown). If you
  want deletion to remove the text everywhere, store only a length instead.
- Dates render in UTC first and switch to the browser's time zone after load.
- "Back to leads" returns to the plain list, not the filtered list you came from.
- The list's filter form needs the Apply button (it works without JavaScript by design).
