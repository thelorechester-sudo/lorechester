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
        {/* Tall, quiet frame on white — the photograph carries the card, so the
            only chrome is a hairline and a slow zoom on hover. */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-card border border-line bg-paper-pure">
          {product.image ? (
            <>
              <Image
                src={product.image.url}
                alt={product.image.alt || product.title}
                fill
                priority={priority}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={
                  "object-cover transition-all duration-700 ease-out-expo group-hover:scale-[1.04] " +
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

          {/* One status label, never a stack of them — sold out outranks a
              discount, a discount outranks a low-stock nudge. */}
          {(soldOut || onSale || lowStock) && (
            <span
              className={
                "meta absolute left-3 top-3 rounded-pill px-2.5 py-1 " +
                (soldOut
                  ? "bg-ink text-paper"
                  : onSale
                    ? "bg-accent text-paper-pure"
                    : "bg-paper-pure text-ink")
              }
            >
              {soldOut
                ? "Sold out"
                : onSale
                  ? `−${discountPercent}%`
                  : `${product.totalStock} left`}
            </span>
          )}

          {/* Sizes ride the image on hover instead of taking a permanent row —
              that reclaimed row is what lets the grid breathe. Touch has no
              hover, so below lg they stay visible. */}
          {product.sizes.length > 1 && (
            <ul
              className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 bg-gradient-to-t from-paper-pure via-paper-pure/90 to-transparent px-3 pb-2.5 pt-8 transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100"
              aria-label="Available sizes"
            >
              {product.sizes.map((variant) => (
                <li
                  key={variant.size}
                  className={
                    "meta " +
                    (variant.stock > 0
                      ? "text-ink"
                      : "text-muted/50 line-through decoration-1")
                  }
                >
                  {variant.size}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-3 pt-3.5">
          <h3 className="text-sm font-medium leading-snug tracking-tight">
            {product.title}
          </h3>
          <p className="flex shrink-0 items-baseline gap-2 tabular-nums text-xs">
            {onSale && (
              <span className="text-muted line-through">
                {formatIDR(product.compareAtPrice!)}
              </span>
            )}
            <span className={onSale ? "text-accent" : ""}>
              {formatIDR(product.price)}
            </span>
          </p>
        </div>
        {product.category && (
          <p className="meta mt-1 text-muted">{product.category}</p>
        )}
      </Link>
    </article>
  );
}

/** Shared grid so every listing on the site lines up the same way. */
export function ProductGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}
