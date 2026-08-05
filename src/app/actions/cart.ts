"use server";

import { priceCart } from "@/lib/cart";
import { cartItemsSchema, EMPTY_CART, type PricedCart } from "@/lib/cart-types";

/**
 * Price the bag for display. Called by the cart drawer whenever its contents
 * change, so the customer always sees live prices and live stock rather than
 * whatever was in localStorage when they added the item.
 */
export async function getCartLines(items: unknown): Promise<PricedCart> {
  const parsed = cartItemsSchema.safeParse(items);
  if (!parsed.success) return EMPTY_CART;
  return priceCart(parsed.data);
}
