import { z } from "zod";

import { imageSource } from "@/lib/validation";

/*
 * Deliberately free of `server-only` and of any database import: the admin
 * form is a client component and needs DEFAULT_HOME for its placeholders.
 * The read that touches the database lives in @/lib/content instead.
 */

/**
 * Editable home page copy.
 *
 * Every field is optional and every read falls back to DEFAULT_HOME, which is
 * the copy that used to be hardcoded in src/app/(store)/page.tsx. A blank
 * field in the admin form therefore means "keep the built-in wording" rather
 * than "render nothing" — the page can never be emptied by accident.
 *
 * Catalog-driven parts of the home page are deliberately not here: the hero
 * title and description still come from the newest collection, and the
 * featured grid still comes from products flagged featured. Those already had
 * an admin surface; duplicating them would give two places to edit one thing.
 */
export const HOME_KEY = "home";

/** Blank strings are treated as "unset" so the default shows through. */
const line = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const homeSettingsSchema = z.object({
  /** Ticker strings. An empty list falls back to the defaults. */
  marquee: z.array(z.string().trim().min(1).max(80)).max(8).default([]),

  heroEyebrow: line(120),
  heroPrimaryCta: line(40),
  heroSecondaryCta: line(40),
  /** Overrides the newest collection's hero image when set. */
  heroImage: imageSource.optional().or(z.literal("").transform(() => undefined)),

  featuredHeading: line(60),
  featuredLinkLabel: line(40),

  editorialEyebrow: line(120),
  editorialHeading: line(120),
  editorialBody: z
    .string()
    .trim()
    .max(600)
    .optional()
    .transform((value) => (value ? value : undefined)),
  editorialCta: line(40),
  editorialHref: line(200),
  editorialImage: imageSource
    .optional()
    .or(z.literal("").transform(() => undefined)),

  dropHeading: line(80),
  dropBody: z
    .string()
    .trim()
    .max(400)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type HomeSettings = z.infer<typeof homeSettingsSchema>;

/** The wording the page shipped with. Used wherever a field is unset. */
export const DEFAULT_HOME = {
  marquee: [
    "Uncommon wear on your terraces",
    "Limited runs — once it's gone, it's gone",
    "Jongeren uit Zuidoost-Azië",
  ],
  heroEyebrow: "Uncommon wear on your terraces",
  heroPrimaryCta: "Shop the drop",
  heroSecondaryCta: "All articles",
  featuredHeading: "Featured",
  featuredLinkLabel: "View all",
  editorialEyebrow: "Between the stone, steel, and stitch",
  editorialHeading: "Cut heavy.\nPrinted small.",
  editorialBody:
    "Every article gets a code before it gets a name, and every run is capped. We print what we can stand behind, sell it once, and move on to the next one.",
  editorialCta: "Read more",
  editorialHref: "/about",
  dropHeading: "Get the drop first",
  dropBody:
    "Runs are small and they go fast. Join the list and we'll message you before the next one goes live — no other email, ever.",
} as const;

/** A settings object with every field resolved to a usable value. */
export type ResolvedHome = typeof DEFAULT_HOME & {
  marquee: string[];
  heroImage?: string;
  editorialImage?: string;
};

export function resolveHome(stored: Partial<HomeSettings>): ResolvedHome {
  return {
    ...DEFAULT_HOME,
    ...Object.fromEntries(
      Object.entries(stored).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : value !== undefined,
      ),
    ),
  } as ResolvedHome;
}
