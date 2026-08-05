import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { productImages, products, variants } from "@/lib/db/schema";
import {
  EMPTY_CART,
  type CartItem,
  type CartLine,
  type PricedCart,
} from "@/lib/cart-types";

/**
 * Server-side cart pricing. THE single place a cart turns into money.
 *
 * The browser sends variant ids and quantities and nothing else — never a
 * price. Both the cart drawer and checkout call this, so what the customer
 * sees and what they are charged come from the same query.
 */

export async function priceCart(items: CartItem[]): Promise<PricedCart> {
  if (items.length === 0) return EMPTY_CART;

  // Collapse duplicates before hitting the database.
  const wanted = new Map<string, number>();
  for (const item of items) {
    wanted.set(item.variantId, (wanted.get(item.variantId) ?? 0) + item.qty);
  }

  const rows = await db
    .select({
      variantId: variants.id,
      productId: products.id,
      slug: products.slug,
      title: products.title,
      size: variants.size,
      color: variants.color,
      stock: variants.stock,
      weightGrams: products.weightGrams,
      basePrice: products.price,
      priceOverride: variants.priceOverride,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(
      and(
        inArray(variants.id, [...wanted.keys()]),
        // A product pulled from sale must not stay purchasable via a stale cart.
        eq(products.status, "active"),
      ),
    );

  const covers = rows.length
    ? await db
        .select({
          productId: productImages.productId,
          url: productImages.url,
          position: productImages.position,
        })
        .from(productImages)
        .where(inArray(productImages.productId, rows.map((r) => r.productId)))
        .orderBy(asc(productImages.position))
    : [];

  const coverByProduct = new Map<string, string>();
  for (const cover of covers) {
    if (!coverByProduct.has(cover.productId)) {
      coverByProduct.set(cover.productId, cover.url);
    }
  }

  const issues: string[] = [];
  const lines: CartLine[] = [];

  for (const row of rows) {
    const qty = wanted.get(row.variantId)!;
    const unitPrice = row.priceOverride ?? row.basePrice;
    const fulfillableQty = Math.min(qty, row.stock);

    if (row.stock === 0) {
      issues.push(`${row.title} (${row.size}) sold out.`);
    } else if (fulfillableQty < qty) {
      issues.push(
        `${row.title} (${row.size}): only ${row.stock} left, quantity reduced.`,
      );
    }

    lines.push({
      variantId: row.variantId,
      productId: row.productId,
      slug: row.slug,
      title: row.title,
      size: row.size,
      color: row.color,
      image: coverByProduct.get(row.productId) ?? null,
      unitPrice,
      qty,
      fulfillableQty,
      stock: row.stock,
      lineTotal: unitPrice * fulfillableQty,
      weightGrams: row.weightGrams,
    });
  }

  // Anything requested but not returned no longer exists or is off sale.
  const found = new Set(rows.map((r) => r.variantId));
  const missing = [...wanted.keys()].filter((id) => !found.has(id));
  if (missing.length) {
    issues.push(
      missing.length === 1
        ? "An item in your bag is no longer available and was removed."
        : `${missing.length} items in your bag are no longer available and were removed.`,
    );
  }

  return summarise(lines, issues);
}

function summarise(lines: CartLine[], issues: string[]): PricedCart {
  const sellable = lines.filter((line) => line.fulfillableQty > 0);

  return {
    lines,
    subtotal: sellable.reduce((sum, line) => sum + line.lineTotal, 0),
    totalWeightGrams: sellable.reduce(
      (sum, line) => sum + line.weightGrams * line.fulfillableQty,
      0,
    ),
    issues,
  };
}

