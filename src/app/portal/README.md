# /portal — reserved for Module 2 (Carrier Portal)

This route is **reserved** for the future HAULIX Carrier Portal. Nothing here is implemented yet.
`page.tsx` is a "coming soon" placeholder and is marked `noindex`.

## Planned scope (Module 2)

- Carrier registration and authentication (`/portal/login`, `/portal/register`)
- Carrier dashboard
- Truck management
- Document management
- Load management
- Earnings
- Dispatcher communication
- Notifications

## How the public site is prepared for it

- The navbar already has a **Carrier Login** item. It is disabled while
  `siteConfig.portal.enabled` is `false` (`src/config/site.ts`). Set it to `true` and it links to
  `/portal/login`.
- `robots.txt` already disallows `/portal/`.
- The portal will get its own route group layout (no marketing navbar/footer) under this folder.
- Shared building blocks to reuse: `src/components/ui`, `src/lib/prisma.ts`, `src/lib/utils.ts`,
  and the design tokens in `src/app/globals.css`.
- Add portal data models to `prisma/schema.prisma`; Module 1 models are unaffected.

See `ARCHITECTURE.md` for the full integration strategy.
