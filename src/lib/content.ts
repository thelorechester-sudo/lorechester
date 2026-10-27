import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { cache } from "react";

import { FREE_SHIPPING_THRESHOLD } from "@/lib/config";
import { db } from "@/lib/db";
import { articles, products, settings, showcases } from "@/lib/db/schema";
import {
  pageKey,
  pageSettingsSchema,
  resolvePage,
  type PageContent,
  type PageSlug,
} from "@/lib/pages";
import { SITE_KEY, resolveSite, siteSettingsSchema, type ResolvedSite } from "@/lib/site";
import {
  HOME_KEY,
  homeSettingsSchema,
  resolveHome,
  type ResolvedHome,
} from "@/lib/settings";

/**
 * Public content queries. Everything filters to published — a draft must not
 * be reachable by guessing its slug.
 */

export async function getPublishedArticles(limit?: number) {
  return db
    .select()
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
    .limit(limit ?? 100);
}

export async function getArticleBySlug(slug: string) {
  const [article] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.status, "published")))
    .limit(1);

  return article ?? null;
}

export async function getPublishedShowcases(limit?: number) {
  return db
    .select()
    .from(showcases)
    .where(eq(showcases.published, true))
    .orderBy(asc(showcases.position), desc(showcases.createdAt))
    .limit(limit ?? 20);
}

/** Products tagged on a showcase, for the "shop the look" strip. */
export async function getShowcaseProducts(productIds: string[]) {
  if (productIds.length === 0) return [];

  return db.query.products.findMany({
    columns: { id: true, slug: true, title: true, price: true },
    with: { images: true },
    where: and(inArray(products.id, productIds), eq(products.status, "active")),
  });
}

/**
 * Admin-editable home page copy.
 *
 * Never throws on bad data: a row that fails validation — hand-edited, or
 * written under an older shape — falls back to the defaults rather than
 * taking the storefront down.
 */
export async function getHomeSettings(): Promise<ResolvedHome> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, HOME_KEY))
    .limit(1);

  if (!row) return resolveHome({});

  const parsed = homeSettingsSchema.safeParse(row.value);
  if (!parsed.success) {
    console.warn("home settings failed validation; using defaults");
    return resolveHome({});
  }

  return resolveHome(parsed.data);
}

/**
 * Site-wide settings (navigation, footer, contact details, free-shipping
 * offer). Cached per request: the layout, the footer and the page body all
 * need it. Falls back to the built-in values on a missing or invalid row.
 */
export const getSiteSettings = cache(async (): Promise<ResolvedSite> => {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, SITE_KEY))
    .limit(1);

  const parsed = row ? siteSettingsSchema.safeParse(row.value) : null;
  if (row && !parsed?.success) {
    console.warn("site settings failed validation; using defaults");
  }

  return resolveSite(parsed?.success ? parsed.data : {}, FREE_SHIPPING_THRESHOLD);
});

/** An editable text page, with the built-in wording for anything unset. */
export async function getPageContent(slug: PageSlug): Promise<PageContent> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, pageKey(slug)))
    .limit(1);

  const parsed = row ? pageSettingsSchema.safeParse(row.value) : null;
  if (row && !parsed?.success) {
    console.warn(`page "${slug}" failed validation; using defaults`);
  }

  return resolvePage(slug, parsed?.success ? parsed.data : {});
}
