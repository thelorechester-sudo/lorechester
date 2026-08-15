import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { collections, productCollections, products } from "@/lib/db/schema";

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

/**
 * Price facet buckets, in rupiah.
 *
 * Fixed rather than derived from the catalog: a shopper who bookmarks
 * `?price=250-380` should still get that band next season, and derived edges
 * would shift every time a product is added.
 */
export const PRICE_BANDS = [
  { id: "under-250", label: "Under Rp 250.000", min: 0, max: 250_000 },
  { id: "250-380", label: "Rp 250.000 – 380.000", min: 250_000, max: 380_000 },
  { id: "380-510", label: "Rp 380.000 – 510.000", min: 380_000, max: 510_000 },
  { id: "510-plus", label: "Rp 510.000 and up", min: 510_000, max: null },
] as const;

export type PriceBandId = (typeof PRICE_BANDS)[number]["id"];

export function isPriceBand(value: string | undefined): value is PriceBandId {
  return PRICE_BANDS.some((band) => band.id === value);
}

export type ShopFilters = {
  collectionSlug?: string;
  /** Multi-select: a product matches if it is in any of the listed categories. */
  categories?: string[];
  /** Multi-select: a product matches if it comes in any of the listed sizes. */
  sizes?: string[];
  price?: PriceBandId;
  inStockOnly?: boolean;
  sort?: "newest" | "price-asc" | "price-desc";
  /** Free-text search over title, description and category. */
  q?: string;
};

/**
 * One facet value and how many articles the shopper gets by choosing it,
 * counted with the rest of the current filters applied.
 */
export type Facet = { value: string; count: number };

export type ShopListing = {
  items: CardProduct[];
  categories: Facet[];
  sizes: Facet[];
  prices: { id: PriceBandId; label: string; count: number }[];
  inStockCount: number;
  /** Articles in scope before any facet is applied — what "Clear all" returns. */
  total: number;
};

/*
 * The listing filters, sorts and counts in memory over one query for the
 * catalog in scope, rather than pushing each facet into SQL.
 *
 * That is what makes honest facet counts affordable: a count per value needs
 * the result set recomputed with that value's own group lifted, which is four
 * more round trips in SQL and four array passes here. It also drops the
 * product-id round trips the size and collection facets used to need.
 *
 * ponytail: whole active catalog into memory per request. It was already
 * unpaginated, so this adds counting, not a new ceiling. Push the predicates
 * back into SQL when the catalog outgrows a few thousand articles — the
 * matcher table below is the spec to port.
 */

/** A card plus the text search runs over, folded once at load. */
export type SearchableCard = CardProduct & { search: string };

async function getCatalogCards(
  collectionSlug?: string,
): Promise<SearchableCard[]> {
  const conditions = [eq(products.status, "active")];

  if (collectionSlug) {
    const ids = await db
      .select({ id: productCollections.productId })
      .from(productCollections)
      .innerJoin(collections, eq(productCollections.collectionId, collections.id))
      .where(eq(collections.slug, collectionSlug));
    if (ids.length === 0) return [];
    conditions.push(inArray(products.id, ids.map((r) => r.id)));
  }

  const rows = await db.query.products.findMany({
    columns: { ...cardColumns, description: true },
    with: cardWith,
    where: and(...conditions),
    orderBy: desc(products.createdAt),
  });

  return rows.map((row) => ({
    ...toCard(row),
    // Slug carries the SKU, which is what the header search box invites.
    search: [row.title, row.description, row.category, row.slug]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));
}

/** Does this product come in `size`, in stock if the shopper asked for that? */
function hasSize(card: CardProduct, size: string, inStockOnly: boolean): boolean {
  return card.sizes.some(
    (variant) =>
      variant.size === size && (!inStockOnly || variant.stock > 0),
  );
}

function inBand(card: CardProduct, price: PriceBandId | undefined): boolean {
  const band = PRICE_BANDS.find((b) => b.id === price);
  if (!band) return true;
  // Half-open [min, max) so a product priced exactly at an edge lands in the
  // upper band only, and no product can match two bands at once.
  return card.price >= band.min && (band.max === null || card.price < band.max);
}

/**
 * One predicate per facet group, keyed by group. Counting a group's values
 * means running every matcher *except* that group's — the usual OR-within,
 * AND-across facet rule — so they have to stay separable.
 */
const MATCHERS = {
  category: (card: SearchableCard, f: ShopFilters) =>
    !f.categories?.length ||
    (card.category !== null && f.categories.includes(card.category)),

  size: (card: SearchableCard, f: ShopFilters) =>
    !f.sizes?.length ||
    f.sizes.some((size) => hasSize(card, size, Boolean(f.inStockOnly))),

  price: (card: SearchableCard, f: ShopFilters) => inBand(card, f.price),

  // Coarse gate only. A size-specific stock check lives in the size matcher,
  // which keeps this one independent of which sizes are selected.
  stock: (card: SearchableCard, f: ShopFilters) =>
    !f.inStockOnly || card.totalStock > 0,

  q: (card: SearchableCard, f: ShopFilters) => {
    const query = f.q?.trim().toLowerCase();
    return !query || card.search.includes(query);
  },
} as const;

type Group = keyof typeof MATCHERS;

function apply(
  cards: SearchableCard[],
  filters: ShopFilters,
  except?: Group,
): SearchableCard[] {
  const groups = (Object.keys(MATCHERS) as Group[]).filter((g) => g !== except);
  return cards.filter((card) =>
    groups.every((group) => MATCHERS[group](card, filters)),
  );
}

function sortCards<T extends CardProduct>(cards: T[], sort: ShopFilters["sort"]): T[] {
  if (sort === "price-asc") return [...cards].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return [...cards].sort((a, b) => b.price - a.price);
  return cards; // already newest-first from the query
}

export async function getShopListing(
  filters: ShopFilters = {},
): Promise<ShopListing> {
  return buildListing(await getCatalogCards(filters.collectionSlug), filters);
}

/** The filtering and counting, split from the query so it can be tested. */
export function buildListing(
  cards: SearchableCard[],
  filters: ShopFilters = {},
): ShopListing {
  // Facet values come from the catalog in scope, not the whole site — a
  // collection of two articles must not offer the seven sizes the site sells.
  const categoryValues = [
    ...new Set(cards.map((c) => c.category).filter((c): c is string => Boolean(c))),
  ].sort();
  const sizeValues = orderSizes([
    ...new Set(cards.flatMap((c) => c.sizes.map((v) => v.size))),
  ]);

  const forCategory = apply(cards, filters, "category");
  const forSize = apply(cards, filters, "size");
  const forPrice = apply(cards, filters, "price");
  const forStock = apply(cards, filters, "stock");

  return {
    items: sortCards(apply(cards, filters), filters.sort),
    total: cards.length,
    categories: categoryValues.map((value) => ({
      value,
      count: forCategory.filter((c) => c.category === value).length,
    })),
    sizes: sizeValues.map((value) => ({
      value,
      count: forSize.filter((c) =>
        hasSize(c, value, Boolean(filters.inStockOnly)),
      ).length,
    })),
    prices: PRICE_BANDS.map((band) => ({
      id: band.id,
      label: band.label,
      count: forPrice.filter((c) => inBand(c, band.id)).length,
    })),
    inStockCount: forStock.filter((c) => c.totalStock > 0).length,
  };
}

/** Kept for the homepage, which wants products and no facets. */
export async function getShopProducts(
  filters: ShopFilters = {},
): Promise<CardProduct[]> {
  return (await getShopListing(filters)).items;
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

/**
 * Sizes the way clothing is sized, not the way the alphabet is. Covers both
 * spellings; "One Size" sorts last, after every numbered size.
 */
const SIZE_ORDER = [
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

function orderSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a);
    const bi = SIZE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}
