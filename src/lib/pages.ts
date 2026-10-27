import { z } from "zod";

/*
 * Editable store pages. Like the home page, each one falls back to the copy it
 * shipped with (PAGE_DEFAULTS), so a page the admin has never touched renders
 * exactly what it always did. The text is in the plain format described in
 * @/lib/prose-parse, with {{tokens}} for values kept in Site settings:
 *   {{email}} {{whatsapp}} {{business_name}} {{business_address}}
 *   {{business_id}} {{free_shipping}}
 *
 * Free of `server-only` and of any database import: the admin form is a client
 * component and needs the defaults.
 */

export const PAGE_SLUGS = [
  "about",
  "shipping-returns",
  "size-guide",
  "returns",
  "terms",
  "privacy",
] as const;

export type PageSlug = (typeof PAGE_SLUGS)[number];

export function isPageSlug(value: string): value is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(value);
}

export const pageKey = (slug: PageSlug) => `page:${slug}`;

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const pageSettingsSchema = z.object({
  title: text(80),
  description: text(200),
  body: text(30_000),
});

export type PageSettings = z.infer<typeof pageSettingsSchema>;

export type PageContent = {
  title: string;
  description: string;
  body: string;
};

export const PAGE_DEFAULTS: Record<PageSlug, PageContent> = {
  about: {
    title: "About",
    description:
      "Lorechester is an Indonesian clothing label making heavyweight cut-and-sew in limited runs.",
    body: `Lorechester is a clothing label from Indonesia. We make heavyweight cut-and-sew in short runs, print it ourselves, and sell it here.

Every drop is capped. When a size sells out it usually stays sold out — we would rather move on to the next thing than reprint something twice. If you want to know when the next run lands, join the list on any product page.

Orders ship from Bandung within one to two working days. We use JNE, J&T and SiCepat; the exact cost is quoted from your address at checkout, so you never pay a padded flat rate.

## Get in touch

Questions about an order, a size, or a restock — message us on WhatsApp or email and a person will answer.

- [Track an order](/orders/lookup)
- [Size guide](/size-guide)
- [Shipping & returns](/shipping-returns)`,
  },

  "shipping-returns": {
    title: "Shipping & returns",
    description:
      "How Lorechester orders are shipped across Indonesia, and how exchanges work.",
    body: `## Shipping

- Orders are packed and handed to the courier within 1–2 working days of payment clearing.
- We ship nationwide with JNE, J&T and SiCepat. You pick the courier at checkout and the price is quoted live from your address — no flat rate, no padding.
- Shipping is free on orders over {{free_shipping}}.
- A tracking number is sent to your WhatsApp as soon as the parcel leaves us.

## Exchanges

- Unworn, unwashed items with tags attached can be exchanged within 7 days of delivery.
- Message us first so we can hold the size you want — stock is limited and we cannot guarantee a swap once a size is gone.
- Return shipping is on you unless the item arrived faulty or we sent the wrong thing, in which case we cover it both ways.
- Sale items and items marked final sale cannot be exchanged.

## Faulty items

If something arrives damaged, send us a photo within 48 hours of delivery and we will replace it or refund you in full.`,
  },

  "size-guide": {
    title: "Size guide",
    description:
      "Lorechester measurements in centimetres, taken flat. Sizes S through 3XL.",
    body: `All measurements in centimetres, taken with the garment laid flat. Allow 1–2 cm either way — everything is cut and sewn in small runs.

| Size | Width (Lebar) | Length (Panjang) | Shoulder (Bahu) | Short sleeve (Lengan pendek) | Long sleeve (Lengan panjang) |
| S | 46 | 66 | 11 | 21 | 52 |
| M | 49 | 70 | 12 | 22 | 53 |
| L | 52 | 72 | 13 | 23 | 55 |
| XL | 55 | 74 | 15 | 24 | 56 |
| 2XL | 58 | 76 | 16 | 25 | 57 |
| 3XL | 62 | 79 | 17 | 27 | 58 |

/brand/size-chart.jpg

## Still not sure?

Measure a shirt you already own and like, lay it flat, and match it against the width and length columns above. That beats guessing from your usual size, because every brand cuts differently. Message us on WhatsApp if you are between two sizes — we will tell you which way the particular article runs.`,
  },

  returns: {
    title: "Returns & exchanges",
    description:
      "How to exchange or return a Lorechester order, and what we do if something arrives wrong.",
    body: `If we sent the wrong thing or it arrived damaged, that is on us and we fix it at our cost. If it simply does not fit, we will exchange it where we still have the size.

## Our mistake or a faulty item

- Send us a photo within **48 hours** of delivery.
- We replace it or refund you in full, and we pay the return shipping both ways.
- If we cannot replace it because the run has sold out, you get a full refund.

## Wrong size

- Exchanges accepted within **7 days** of delivery.
- Unworn and unwashed, tags attached, in a condition we could sell again.
- **Message us before sending it.** Runs are small — we need to hold the replacement size for you, and once a size is gone we cannot swap it.
- Return postage is yours; we cover sending the new one out.
- Check the [size guide](/size-guide) before ordering. Measuring a shirt you already own beats guessing.

## What we cannot take back

- Worn or washed items.
- Items marked final sale at the time of purchase.
- Stickers and other small accessories.
- Anything returned without messaging us first.

## Refunds

Refunds go back to the original payment method once we have received and checked the item. Banks usually take 3–14 working days to show it. Original shipping is only refunded when the fault was ours.

## How to start

Message **{{whatsapp}}** or email **{{email}}** with your order number — it looks like LCTR-7K3M9QDX. You can find it on your [order page](/orders/lookup).

None of this limits your rights under Indonesian consumer protection law.`,
  },

  terms: {
    title: "Terms of service",
    description: "The terms you agree to when ordering from Lorechester.",
    body: `Last updated: 5 August 2026

## Who you are buying from

This store is operated by **{{business_name}}**, registered at **{{business_address}}**, Indonesia. Business registration number **{{business_id}}**. Contact: **{{email}}** and **{{whatsapp}}**.

## Orders and prices

- All prices are in Indonesian Rupiah and include applicable tax.
- An order is a request to buy. It is accepted only once payment clears — until then we may decline it, for example if an item sells out while you are paying.
- The price charged is the price calculated by our server at checkout. If a price is displayed incorrectly, we will contact you before shipping rather than silently charging a different amount.
- Stock is limited and not reserved while an item sits in your bag.

## Payment

Payments are processed by DOKU. We never see or store your card number. An order is only confirmed when DOKU tells us the payment settled; closing the payment window does not complete an order. Unpaid orders expire after 24 hours.

## Delivery

We ship across Indonesia via JNE, J&T and SiCepat. Delivery estimates come from the courier and are not guarantees. Risk passes to you on delivery. Full detail is on the [shipping page](/shipping-returns).

## Returns

Your rights are set out on the [returns page](/returns). Nothing in these terms limits rights you have under Indonesian consumer protection law.

## Our designs

The Lorechester name, marks and print artwork belong to us. Buying a garment does not transfer any right to reproduce the artwork.

## Liability

Our liability for any order is limited to what you paid for it. We are not liable for delays caused by couriers, payment providers or events outside our control.

## Governing law

These terms are governed by the laws of the Republic of Indonesia.`,
  },

  privacy: {
    title: "Privacy policy",
    description: "What Lorechester collects, why, and who it is shared with.",
    body: `Last updated: 5 August 2026

We collect what is needed to send you a parcel and nothing beyond it. We do not sell your data.

## What we collect

- **To fulfil an order:** name, email, WhatsApp number, delivery address, and what you bought. We keep this as a record of the sale.
- **If you join a waitlist:** your email, and your WhatsApp number if you give one. Used only to tell you about that item or the next drop.
- **Automatically:** standard server logs, and analytics if you accept them.

We never see or store your card details — those go straight to DOKU.

## Who it is shared with

- **DOKU** — payment processing. Receives your name, email, phone and order total.
- **Biteship and the courier** — shipping. Receives the delivery name, address and phone.
- **Fonnte** — sends the WhatsApp order updates.
- **Resend** — sends order emails.
- **Supabase and Vercel** — database and hosting.
- **Google Analytics and Meta Pixel** — traffic measurement and advertising. These set cookies and can build a profile across sites. Block them with your browser or an ad blocker if you prefer; the store works without them.

## How long we keep it

Order records are kept while we are required to for tax and accounting. Waitlist entries are kept until you ask to be removed.

## Your choices

- Reply STOP to any WhatsApp message to stop receiving them.
- Message or email us to see, correct or delete what we hold. We may need to keep completed order records for tax reasons.

Contact **{{email}}** or **{{whatsapp}}**.

## Security

The site runs over HTTPS. Our database is not readable from the public internet, order pages use unguessable references, and card data never touches our servers. No system is perfect, but we do not store what we do not need.`,
  },
};

export const PAGE_LABELS: Record<PageSlug, { name: string; path: string; hint: string }> = {
  about: { name: "About", path: "/about", hint: "Who you are and how to get in touch" },
  "shipping-returns": {
    name: "Shipping & returns",
    path: "/shipping-returns",
    hint: "Couriers, delivery times, exchanges",
  },
  "size-guide": { name: "Size guide", path: "/size-guide", hint: "Measurement chart" },
  returns: { name: "Returns & exchanges", path: "/returns", hint: "Returns policy" },
  terms: { name: "Terms of service", path: "/terms", hint: "Legal terms of sale" },
  privacy: { name: "Privacy policy", path: "/privacy", hint: "What data is collected" },
};

export function resolvePage(slug: PageSlug, stored: Partial<PageSettings>): PageContent {
  const base = PAGE_DEFAULTS[slug];
  return {
    title: stored.title ?? base.title,
    description: stored.description ?? base.description,
    body: stored.body ?? base.body,
  };
}
