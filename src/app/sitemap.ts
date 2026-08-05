import { asc, eq } from "drizzle-orm";
import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { articles, collections, products } from "@/lib/db/schema";
import { siteUrl } from "@/lib/env";

// Built per request: the product list changes with every drop, and this keeps
// `next build` from needing a database connection.
export const dynamic = "force-dynamic";

/** Only public, indexable pages belong here — never /admin, /checkout or /orders. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const [activeProducts, allCollections, publishedArticles] = await Promise.all([
    db
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.status, "active")),
    db
      .select({ slug: collections.slug, createdAt: collections.createdAt })
      .from(collections)
      .orderBy(asc(collections.createdAt)),
    db
      .select({ slug: articles.slug, updatedAt: articles.updatedAt })
      .from(articles)
      .where(eq(articles.status, "published")),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/lookbook`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/journal`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/size-guide`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/shipping-returns`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/returns`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...staticRoutes,
    ...activeProducts.map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...allCollections.map((collection) => ({
      url: `${base}/shop/${collection.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...publishedArticles.map((article) => ({
      url: `${base}/journal/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
