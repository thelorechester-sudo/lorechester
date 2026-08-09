import Image from "next/image";
import Link from "next/link";

import type { CardProduct } from "@/lib/catalog";
import { formatIDR } from "@/lib/money";

export function ProductCard({
  product,
  priority = false,
}: {
  product: CardProduct;
  priority?: boolean;
}) {
  const soldOut = product.totalStock === 0;
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;
  const discountPercent = onSale
    ? Math.round(
        ((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100,
      )
    : 0;
  const lowStock = !soldOut && product.totalStock <= 3;

  return (
    <article className="group relative">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-paper">
          {product.image ? (
            <>
              <Image
                src={product.image.url}
                alt={product.image.alt || product.title}
                fill
                priority={priority}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={
                  "object-cover transition-opacity duration-500 " +
                  (product.hoverImage ? "group-hover:opacity-0" : "") +
                  (soldOut ? " opacity-60" : "")
                }
              />
              {product.hoverImage && (
                <Image
                  src={product.hoverImage.url}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="meta text-muted">No image</span>
            </div>
          )}

          <div className="absolute left-0 top-0 flex flex-col items-start gap-1 p-2">
            {soldOut && (
              <span className="meta bg-ink px-2 py-1 text-paper">Sold out</span>
            )}
            {!soldOut && onSale && (
              <span className="meta bg-accent px-2 py-1 text-paper-pure">
                −{discountPercent}%
              </span>
            )}
            {!soldOut && !onSale && lowStock && (
              <span className="meta bg-muted px-2 py-1 text-paper">
                {product.totalStock} left
              </span>
            )}
          </div>
        </div>

        <div className="pt-3">
          <h3 className="text-sm font-medium leading-snug tracking-tight">
            {product.title}
          </h3>
          <p className="mt-1 flex items-baseline gap-2 font-mono text-sm">
            <span className={onSale ? "text-accent" : ""}>
              {formatIDR(product.price)}
            </span>
            {onSale && (
              <span className="text-xs text-muted line-through">
                {formatIDR(product.compareAtPrice!)}
              </span>
            )}
          </p>
        </div>
      </Link>

      {product.sizes.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Available sizes">
          {product.sizes.map((variant) => (
            <li
              key={variant.size}
              className={
                "meta " +
                (variant.stock > 0
                  ? "text-muted"
                  : "text-muted/40 line-through decoration-1")
              }
            >
              {variant.size}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** Shared grid so every listing on the site lines up the same way. */
export function ProductGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}
