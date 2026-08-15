import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ProductCard, ProductGrid } from "@/components/store/product-card";
import {
  ActiveFilters,
  NoResults,
  ShopFilterPanel,
  SortMenu,
  list,
  type Params,
} from "@/components/store/shop-filters";
import {
  getCollectionBySlug,
  getShopListing,
  isPriceBand,
  type ShopFilters,
} from "@/lib/catalog";

// Live stock — see the note in src/app/(store)/page.tsx.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/shop/[collection]">): Promise<Metadata> {
  const { collection: slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return {};

  return {
    title: collection.title,
    description: collection.description || `The ${collection.title} collection.`,
    openGraph: {
      title: collection.title,
      description: collection.description,
      images: collection.heroImage ? [collection.heroImage] : undefined,
    },
  };
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CollectionPage({
  params,
  searchParams,
}: PageProps<"/shop/[collection]">) {
  const [{ collection: slug }, raw] = await Promise.all([params, searchParams]);

  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const queryParams: Params = {
    category: one(raw.category),
    size: one(raw.size),
    price: one(raw.price),
    sort: one(raw.sort),
    inStock: one(raw.inStock),
    q: one(raw.q),
  };

  const filters: ShopFilters = {
    collectionSlug: slug,
    categories: list(queryParams.category),
    sizes: list(queryParams.size),
    price: isPriceBand(queryParams.price) ? queryParams.price : undefined,
    inStockOnly: queryParams.inStock === "1",
    sort:
      queryParams.sort === "price-asc" || queryParams.sort === "price-desc"
        ? queryParams.sort
        : "newest",
    q: queryParams.q,
  };

  const listing = await getShopListing(filters);
  const base = `/shop/${slug}`;

  const notYetReleased =
    collection.releaseAt && collection.releaseAt > new Date();

  return (
    <div>
      {collection.heroImage && (
        <section className="relative flex min-h-[45vh] items-end overflow-hidden bg-ink">
          <Image
            src={collection.heroImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
          <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-10 pt-24 sm:px-8">
            <h1 className="text-headline font-black uppercase text-paper">
              {collection.title}
            </h1>
            {collection.description && (
              <p className="mt-3 max-w-md text-sm leading-relaxed text-paper/80">
                {collection.description}
              </p>
            )}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-[1600px] px-5 py-10 sm:px-8">
        {!collection.heroImage && (
          <h1 className="mb-8 text-headline font-black uppercase">
            {collection.title}
          </h1>
        )}

        {notYetReleased && (
          <p className="mb-8 border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
            Drops{" "}
            {collection.releaseAt!.toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            WIB.
          </p>
        )}

        <div className="lg:flex lg:gap-10">
          <ShopFilterPanel base={base} params={queryParams} listing={listing} />

          <div className="min-w-0 flex-1">
            <ActiveFilters base={base} params={queryParams} />

            <div className="mb-6 flex items-center justify-between gap-4 border-b border-line pb-4">
              <p className="meta text-muted" aria-live="polite">
                {listing.items.length}{" "}
                {listing.items.length === 1 ? "article" : "articles"}
              </p>
              <SortMenu base={base} params={queryParams} />
            </div>

            {listing.items.length === 0 ? (
              <NoResults base={base} params={queryParams} />
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
    </div>
  );
}
