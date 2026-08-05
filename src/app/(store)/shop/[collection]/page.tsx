import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard, ProductGrid } from "@/components/store/product-card";
import { ShopFilterBar } from "@/components/store/shop-filters";
import {
  getCollectionBySlug,
  getShopProducts,
  getSizes,
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

  const queryParams = {
    size: one(raw.size),
    sort: one(raw.sort),
    inStock: one(raw.inStock),
  };

  const filters: ShopFilters = {
    collectionSlug: slug,
    size: queryParams.size,
    inStockOnly: queryParams.inStock === "1",
    sort:
      queryParams.sort === "price-asc" || queryParams.sort === "price-desc"
        ? queryParams.sort
        : "newest",
  };

  const [items, sizes] = await Promise.all([
    getShopProducts(filters),
    getSizes(),
  ]);

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

        <ShopFilterBar
          base={`/shop/${slug}`}
          params={queryParams}
          categories={[]}
          sizes={sizes}
          resultCount={items.length}
        />

        <div className="mt-10">
          {items.length === 0 ? (
            <div className="border border-dashed border-line px-6 py-20 text-center">
              <p className="text-sm text-muted">Nothing here yet.</p>
              <Link
                href="/shop"
                className="meta mt-4 inline-block border-b border-ink pb-1"
              >
                Shop everything
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
