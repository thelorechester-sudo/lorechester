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
  `CHESTER` in Archivo Black on two lines — which is what lets the header sit
  on paper rather than ink. `roundel-white.png` and `wordmark-white.png` are
  the variants for dark sections.
- **Palette**: ink `#0b0b0c`, paper `#faf9f6`, accent oxblood `#980000`
  (sampled from the CLASH DIVISION label). Defined in `globals.css`.
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
Storage · Midtrans Snap (payments) · Biteship (shipping) · Fonnte (WhatsApp) ·
Resend (email) · Tailwind v4.

## Rules that are not negotiable

1. **Money is an integer number of rupiah.** No decimals, no floats, no
   `numeric` columns. Midtrans rejects fractional `gross_amount`. Use the
   helpers in `src/lib/money.ts`.
2. **Never trust a price from the client.** Checkout receives variant ids and
   quantities only; every total is recomputed from the database server-side.
3. **Verify the Midtrans webhook signature** before acting on it, and make the
   handler idempotent — Midtrans retries deliveries.
4. **Stock is decremented in the payment webhook, inside a transaction**, never
   when checkout opens.
5. **Call `requireAdmin()` from `@/lib/auth` in every admin page AND every
   admin Server Action.** `src/proxy.ts` only redirects browsers; a Server
   Action invoked directly never passes through it.
6. **Validate Server Action input with Zod** at the boundary.
7. **The storefront uses no component library.** Admin UI may be utilitarian;
   the storefront is hand-built so it looks like Lorechester and not like a
   template.

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
explains itself when the Midtrans keys are missing.

### Midtrans

Set the notification URL in the Midtrans dashboard under
**Settings → Configuration → Payment Notification URL**:

```
https://your-domain/api/webhooks/midtrans
```

Nothing marks an order paid except that webhook. Locally, expose it with a
tunnel (`ngrok http 3000`) — the Snap popup alone does not settle an order.

## Checks

`npm run typecheck` · `npm test` · `npm run lint` · `npm run build`
