import { and, asc, desc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  collections,
  productCollections,
  products,
  variants,
} from "@/lib/db/schema";

/**
 * Read-side catalog queries shared by the storefront.
 *
 * Every query here filters to `status = 'active'` — draft and archived
 * products must never be reachable from a public page, including by guessing
 * a slug.
 */

export type CardProduct = {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  category: string | null;
  image: { url: string; alt: string } | null;
  hoverImage: { url: string; alt: string } | null;
  totalStock: number;
  sizes: { size: string; stock: number }[];
};

const cardColumns = {
  id: true,
  slug: true,
  title: true,
  price: true,
  compareAtPrice: true,
  category: true,
} as const;

const cardWith = {
  images: { orderBy: asc(sql`position`) },
  variants: { orderBy: asc(sql`position`) },
} as const;

type RawCard = {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  category: string | null;
  images: { url: string; alt: string; position: number }[];
  variants: { size: string; stock: number; position: number }[];
};

function toCard(row: RawCard): CardProduct {
  const images = [...row.images].sort((a, b) => a.position - b.position);
  const sizes = [...row.variants]
    .sort((a, b) => a.position - b.position)
    .map((v) => ({ size: v.size, stock: v.stock }));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    category: row.category,
    image: images[0] ? { url: images[0].url, alt: images[0].alt } : null,
    hoverImage: images[1] ? { url: images[1].url, alt: images[1].alt } : null,
    totalStock: sizes.reduce((sum, s) => sum + s.stock, 0),
    sizes,
  };
}

export async function getFeaturedProducts(limit = 8): Promise<CardProduct[]> {
  const rows = await db.query.products.findMany({
    columns: cardColumns,
    with: cardWith,
    where: and(eq(products.status, "active"), eq(products.featured, true)),
    orderBy: desc(products.createdAt),
    limit,
  });
  return rows.map(toCard);
}

export type ShopFilters = {
  collectionSlug?: string;
  category?: string;
  size?: string;
  inStockOnly?: boolean;
  sort?: "newest" | "price-asc" | "price-desc";
  /** Free-text search over title, description and category. */
  q?: string;
};

/** Escape LIKE wildcards so a search for "50%" doesn't match everything. */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function getShopProducts(
  filters: ShopFilters = {},
): Promise<CardProduct[]> {
  // Collection and size filters live on other tables, so resolve them to a set
  // of product ids first rather than forcing a join into the relational query.
  let restrictTo: string[] | null = null;

  if (filters.collectionSlug) {
    const ids = await db
      .select({ id: productCollections.productId })
      .from(productCollections)
      .innerJoin(collections, eq(productCollections.collectionId, collections.id))
      .where(eq(collections.slug, filters.collectionSlug));
    restrictTo = ids.map((r) => r.id);
  }

  if (filters.size) {
    const ids = await db
      .select({ id: variants.productId })
      .from(variants)
      .where(
        filters.inStockOnly
          ? and(eq(variants.size, filters.size), gt(variants.stock, 0))
          : eq(variants.size, filters.size),
      );
    const sizeIds = ids.map((r) => r.id);
    restrictTo = restrictTo
      ? restrictTo.filter((id) => sizeIds.includes(id))
      : sizeIds;
  }

  if (restrictTo !== null && restrictTo.length === 0) return [];

  const conditions = [eq(products.status, "active")];
  if (restrictTo) conditions.push(inArray(products.id, restrictTo));
  if (filters.category) conditions.push(eq(products.category, filters.category));

  const query = filters.q?.trim();
  if (query) {
    const pattern = `%${escapeLike(query)}%`;
    conditions.push(
      or(
        ilike(products.title, pattern),
        ilike(products.description, pattern),
        ilike(products.category, pattern),
      )!,
    );
  }

  const rows = await db.query.products.findMany({
    columns: cardColumns,
    with: cardWith,
    where: and(...conditions),
    orderBy:
      filters.sort === "price-asc"
        ? asc(products.price)
        : filters.sort === "price-desc"
          ? desc(products.price)
          : desc(products.createdAt),
  });

  const cards = rows.map(toCard);

  // `inStockOnly` without a size means "has stock in any size".
  return filters.inStockOnly && !filters.size
    ? cards.filter((card) => card.totalStock > 0)
    : cards;
}

export async function getProductBySlug(slug: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "active")),
    with: {
      images: { orderBy: asc(sql`position`) },
      variants: { orderBy: asc(sql`position`) },
    },
  });

  if (!product) return null;

  return {
    ...product,
    images: [...product.images].sort((a, b) => a.position - b.position),
    variants: [...product.variants].sort((a, b) => a.position - b.position),
  };
}

export async function getRelatedProducts(
  productId: string,
  category: string | null,
  limit = 4,
): Promise<CardProduct[]> {
  const rows = await db.query.products.findMany({
    columns: cardColumns,
    with: cardWith,
    where: category
      ? and(eq(products.status, "active"), eq(products.category, category))
      : eq(products.status, "active"),
    orderBy: desc(products.createdAt),
    limit: limit + 1,
  });

  return rows
    .filter((row) => row.id !== productId)
    .slice(0, limit)
    .map(toCard);
}

export async function getCollections() {
  return db.query.collections.findMany({ orderBy: desc(collections.createdAt) });
}

export async function getCollectionBySlug(slug: string) {
  return db.query.collections.findFirst({ where: eq(collections.slug, slug) });
}

/** Distinct categories that have at least one active product. */
export async function getCategories(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(eq(products.status, "active"))
    .orderBy(asc(products.category));

  return rows
    .map((r) => r.category)
    .filter((c): c is string => Boolean(c));
}

/** Distinct sizes across active products, ordered the way clothing is sized. */
export async function getSizes(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ size: variants.size })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(eq(products.status, "active"));

  // Covers both spellings; "One Size" sorts last, after every numbered size.
  const ORDER = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "2XL",
    "XXL",
    "3XL",
    "XXXL",
    "4XL",
    "One Size",
  ];
  return rows
    .map((r) => r.size)
    .sort((a, b) => {
      const ai = ORDER.indexOf(a);
      const bi = ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
}
