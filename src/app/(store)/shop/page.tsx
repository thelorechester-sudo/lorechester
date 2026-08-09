import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard, ProductGrid } from "@/components/store/product-card";
import {
  ResultCount,
  ShopFilterPanel,
  SortMenu,
} from "@/components/store/shop-filters";
import {
  getCategories,
  getShopProducts,
  getSizes,
  isPriceBand,
  type ShopFilters,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Every Lorechester piece currently available.",
};

// Live stock — see the note in src/app/(store)/page.tsx.
export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ShopPage({
  searchParams,
}: PageProps<"/shop">) {
  const raw = await searchParams;

  const params = {
    category: one(raw.category),
    size: one(raw.size),
    price: one(raw.price),
    sort: one(raw.sort),
    inStock: one(raw.inStock),
    q: one(raw.q),
  };

  const filters: ShopFilters = {
    category: params.category,
    size: params.size,
    price: isPriceBand(params.price) ? params.price : undefined,
    inStockOnly: params.inStock === "1",
    sort:
      params.sort === "price-asc" || params.sort === "price-desc"
        ? params.sort
        : "newest",
    q: params.q,
  };

  const [items, categories, sizes] = await Promise.all([
    getShopProducts(filters),
    getCategories(),
    getSizes(),
  ]);

  return (
    <div className="mx-auto max-w-[1600px] px-5 py-10 sm:px-8">
      <h1 className="text-headline font-black uppercase">
        {params.q ? "Search" : "Shop all"}
      </h1>

      <div className="mt-8 lg:flex lg:gap-10">
        <ShopFilterPanel
          base="/shop"
          params={params}
          categories={categories}
          sizes={sizes}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-line pb-4">
            <ResultCount count={items.length} query={params.q} />
            <SortMenu base="/shop" params={params} />
          </div>

          {items.length === 0 ? (
            <div className="border border-dashed border-line px-6 py-20 text-center">
              <p className="text-sm text-muted">
                Nothing matches those filters.
              </p>
              <Link
                href="/shop"
                className="meta mt-4 inline-block border-b border-ink pb-1"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <ProductGrid>
              {items.map((product, index) => (
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
