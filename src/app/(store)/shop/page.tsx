import type { Metadata } from "next";

import { ProductCard, ProductGrid } from "@/components/store/product-card";
import {
  ActiveFilters,
  NoResults,
  ShopFilterPanel,
  SortMenu,
  list,
  type Params,
} from "@/components/store/shop-filters";
import { getShopListing, isPriceBand, type ShopFilters } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Every Lorechester piece currently available.",
};

// Live stock — see the note in src/app/(store)/page.tsx.
export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const raw = await searchParams;

  const params: Params = {
    category: one(raw.category),
    size: one(raw.size),
    price: one(raw.price),
    sort: one(raw.sort),
    inStock: one(raw.inStock),
    q: one(raw.q),
  };

  const filters: ShopFilters = {
    categories: list(params.category),
    sizes: list(params.size),
    price: isPriceBand(params.price) ? params.price : undefined,
    inStockOnly: params.inStock === "1",
    sort:
      params.sort === "price-asc" || params.sort === "price-desc"
        ? params.sort
        : "newest",
    q: params.q,
  };

  const listing = await getShopListing(filters);

  return (
    <div className="mx-auto max-w-[1600px] px-5 py-12 sm:px-8">
      <header className="flex items-baseline gap-4 border-b border-line pb-6 sm:gap-6">
        <h1 className="text-headline font-black uppercase">
          {params.q ? "Search" : "Shop all"}
        </h1>
        <span aria-hidden className="h-px flex-1 bg-line" />
      </header>

      <div className="mt-10 lg:flex lg:gap-12">
        <ShopFilterPanel base="/shop" params={params} listing={listing} />

        <div className="min-w-0 flex-1">
          <ActiveFilters base="/shop" params={params} />

          <div className="mb-6 flex items-center justify-between gap-4 border-b border-line pb-4">
            {/* The one place the count is stated. It used to be here and in the
                page header, in two different nouns. */}
            <p className="meta text-muted" aria-live="polite">
              {listing.items.length}{" "}
              {listing.items.length === 1 ? "article" : "articles"}
            </p>
            <SortMenu base="/shop" params={params} />
          </div>

          {listing.items.length === 0 ? (
            <NoResults base="/shop" params={params} />
          ) : (
            <ProductGrid>
              {listing.items.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={index < 4}
                />
              ))}
            </ProductGrid>
          )}
        </div>
      </div>
    </div>
  );
}
