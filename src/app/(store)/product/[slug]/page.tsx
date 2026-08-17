import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/store/add-to-cart";
import { ProductCard, ProductGrid } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { siteUrl } from "@/lib/env";
import { formatIDR } from "@/lib/money";

// Live stock — see the note in src/app/(store)/page.tsx.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: product.title,
    description: product.description.slice(0, 160),
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.title,
      description: product.description.slice(0, 160),
      images: product.images[0] ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(
    product.id,
    product.category,
    4,
  );

  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;

  /*
   * Product structured data. This is what puts the price and availability in
   * Google's result snippet, which is most of the SEO value on a store.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.map((image) => image.url),
    sku: product.variants[0]?.sku ?? undefined,
    brand: { "@type": "Brand", name: "Lorechester" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "IDR",
      lowPrice: Math.min(
        ...product.variants.map((v) => v.priceOverride ?? product.price),
      ),
      highPrice: Math.max(
        ...product.variants.map((v) => v.priceOverride ?? product.price),
      ),
      offerCount: product.variants.length,
      availability:
        totalStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${siteUrl()}/product/${product.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="meta mb-6 text-muted">
        <Link href="/shop" className="hover:text-ink">
          Shop
        </Link>
        {product.category && (
          <>
            {" / "}
            <Link
              href={`/shop?category=${encodeURIComponent(product.category)}`}
              className="hover:text-ink"
            >
              {product.category}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,600px)_minmax(0,1fr)] lg:gap-16">
        <ProductGallery images={product.images} title={product.title} />

        <div className="lg:sticky lg:top-20 lg:self-start">
          <h1 className="text-3xl font-semibold uppercase leading-[0.95] tracking-[-0.04em]">
            {product.title}
          </h1>

          <p className="mt-4 flex items-baseline gap-3 tabular-nums">
            <span className={"text-xl " + (onSale ? "text-accent" : "")}>
              {formatIDR(product.price)}
            </span>
            {onSale && (
              <span className="text-sm text-muted line-through">
                {formatIDR(product.compareAtPrice!)}
              </span>
            )}
          </p>

          {product.description && (
            <p className="mt-5 text-sm leading-relaxed text-muted">
              {product.description}
            </p>
          )}

          <div className="mt-8">
            <AddToCart
              productId={product.id}
              basePrice={product.price}
              variants={product.variants.map((variant) => ({
                id: variant.id,
                size: variant.size,
                color: variant.color,
                stock: variant.stock,
                price: variant.priceOverride ?? product.price,
              }))}
            />
          </div>

          {product.details && (
            <details className="mt-6 border-t border-line pt-4">
              <summary className="meta cursor-pointer list-none text-muted hover:text-ink">
                Materials &amp; care +
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                {product.details}
              </p>
            </details>
          )}

          <details className="border-t border-line py-4">
            <summary className="meta cursor-pointer list-none text-muted hover:text-ink">
              Shipping &amp; returns +
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Ships from Bandung in 1–2 working days via JNE, J&amp;T or
              SiCepat. Exact cost is calculated at checkout from your address.
              Unworn items can be exchanged within 7 days of delivery.
            </p>
          </details>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-8 text-headline font-semibold uppercase">
            You might also like
          </h2>
          <ProductGrid>
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </ProductGrid>
        </section>
      )}
    </div>
  );
}
