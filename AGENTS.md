<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Lorechester

Online clothing store for the Lorechester brand, selling to customers in
Indonesia. One Next.js app holds both the public storefront and the `/admin`
back office.

## The brand

Football casuals / terrace wear, not generic streetwear. Get this right before
touching any copy or design.

- **Spelling is `LORECHESTER`** — one word, with the middle E. Styled
  `LORE CHESTER` on two lines in the lockup. Never "Lorchester".
- **Marks** (in `public/brand/`): a wagon-wheel roundel reading UNITED
  TROUBLEHOOD / LORECHESTER TROOPS, the horizontal wheel + wordmark lockup, a
  castle-and-mountain LORECHESTER OUTWEAR crest, and an Atalanta lion badge.
  The supplied horizontal lockup is white-on-transparent, so the header does
  not use it: it sets the lockup live instead — `roundel.png` beside `LORE` /
  `CHESTER` in Instrument Sans 600 on two lines — which is what lets the header
  sit on paper rather than ink. `roundel-white.png` and `wordmark-white.png`
  are the variants for dark sections. The roundel's red hub is the only colour
  on the page outside the palette below.
- **Palette**: ink `#000000`, paper `#ffffff`, line `#dfdfdf`, muted `#6b6b6b`,
  accent `#8b0000`. Defined in the `@theme` block in `globals.css`, which is
  the only place a hex belongs — the sole exception is
  `src/app/opengraph-image.tsx`, which renders through `ImageResponse` and
  cannot use Tailwind classes.
- **Type**: Instrument Sans for everything — 400 body, 500 for the small
  uppercase `meta` labels, 600 headings. There is no second face; the brand
  previously paired Archivo Black with a mono and no longer does, so do not
  reach for `font-mono` or `font-black` (Instrument Sans stops at 700).
  **Body is 14px**, matching the reference the design is drawn from. Form
  inputs are pinned to 16px in the base layer and must stay there: iOS Safari
  zooms the viewport on focus below that and does not zoom back out, which
  strands customers mid-checkout.
- **Shape**: rounded, not square. `rounded-button` (14px) for buttons,
  `rounded-input` (4px) for fields and small chips, `rounded-card` (0.8rem)
  for cards and image frames, `rounded-pill` for removable filter tags.
- **Voice**: "Uncommon wear on your terraces", "Jongeren uit Zuidoost-Azië",
  "No City Humbles Us", "Undominated", "Between the stone, steel, and stitch".
  Dry, plain, no hype.
- **Articles get a code before a name** — CPS-825, NCHU-0126, CSL-001,
  TCD-001, CSG-001, FWC-026, SOG-1125. Codes are the SKUs.

Real photography lives in `public/lookbook/` (two shoots: `goal-*` night flash,
`nchu-*` studio and car). Product graphics are in `public/products/`. All of it
came from the client's ASSET drive and is downscaled for web.

## Stack

Next.js 16 (App Router) · Drizzle + Supabase Postgres · Supabase Auth &
Storage · DOKU Checkout (payments) · Biteship (shipping) · Fonnte (WhatsApp) ·
Resend (email) · Tailwind v4.

## Rules that are not negotiable

1. **Money is an integer number of rupiah.** No decimals, no floats, no
   `numeric` columns. DOKU rejects fractional amounts. Use the
   helpers in `src/lib/money.ts`.
2. **Never trust a price from the client.** Checkout receives variant ids and
   quantities only; every total is recomputed from the database server-side.
3. **Verify the DOKU webhook signature** before acting on it, and make the
   handler idempotent — DOKU retries deliveries (up to 6 times, exponential
   backoff, until it gets a 2xx).
4. **Stock is decremented in the payment webhook, inside a transaction**, never
   when checkout opens.
5. **Call `requireAdmin()` from `@/lib/auth` in every admin page AND every
   admin Server Action.** `src/proxy.ts` only redirects browsers; a Server
   Action invoked directly never passes through it.
6. **Validate Server Action input with Zod** at the boundary.
7. **The storefront uses no component library.** Admin UI may be utilitarian;
   the storefront is hand-built. The visual system is deliberately modelled on
   a reference store (snsbworld.com) at the client's direction, so "does this
   look like a template" is no longer the test — "does this match the tokens in
   `globals.css`" is. Style through those tokens rather than adding a
   dependency or hardcoding values.

## Running locally with no accounts

`NEXT_PUBLIC_DEMO_MODE=1` in `.env.local` swaps the Supabase Postgres
connection for **PGlite** — Postgres compiled to WASM, running in-process
against `.pglite/`. No Docker, no Supabase account, and the whole app works
for real, writes included. `requireAdmin()` also returns a local admin in this
mode, so `/admin` is open.

```bash
npm run db:seed   # creates .pglite/ and loads the demo catalog
npm run dev
```

The local admin bypass is additionally gated on `NODE_ENV !== "production"`,
so it cannot be switched on by an env var in a deployed build.

Only one process may hold `.pglite/` at a time — stop `next dev` before running
`db:seed`. If a seed aborts with a WASM error, the directory was left
inconsistent: `rm -rf .pglite` and seed again.

## Setup

1. Create a Supabase project, then `cp .env.example .env.local` and fill in the
   Supabase URL, keys and both connection strings.
2. `npm run db:push` — creates the tables.
3. Run `supabase/setup.sql` in the Supabase SQL editor. This adds the
   profile trigger, turns on RLS (which is what keeps the anon key from reading
   your orders table), and creates the `media` storage bucket.
4. Sign up at `/admin/login`, then promote yourself:
   `update public.profiles set role = 'admin' where email = 'you@example.com';`
5. `npm run db:seed` for a demo catalog, then `npm run dev`.

Payments and shipping are optional until you need them — checkout falls back to
a flat shipping rate when `BITESHIP_API_KEY` is unset, and the pay button
explains itself when the DOKU keys are missing.

### DOKU

DOKU Checkout is a hosted payment page: `createDokuPayment` (`src/lib/doku.ts`)
returns a URL, and the browser is redirected there — no client-side script or
popup involved. Set the Notification URL in the DOKU Back Office to:

```
https://your-domain/api/webhooks/doku
```

Nothing marks an order paid except that webhook. Locally, expose it with a
tunnel (`ngrok http 3000`) — landing back on the order page after paying does
not settle an order by itself.

## Checks

`npm run typecheck` · `npm test` · `npm run lint` · `npm run build`
