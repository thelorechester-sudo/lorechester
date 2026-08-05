import { z } from "zod";

/**
 * Cart shapes shared by the browser and the server.
 *
 * Kept separate from `cart.ts` on purpose: that module imports Drizzle, and a
 * Client Component importing a *value* from it (not just a type) pulls the
 * whole Postgres driver into the browser bundle.
 */

export const cartItemsSchema = z
  .array(
    z.object({
      variantId: z.uuid(),
      qty: z.number().int().min(1).max(20),
    }),
  )
  .max(50);

export type CartItem = z.infer<typeof cartItemsSchema>[number];

export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  title: string;
  size: string;
  color: string | null;
  image: string | null;
  unitPrice: number;
  /** What the customer asked for. */
  qty: number;
  /** What we can actually sell them right now. */
  fulfillableQty: number;
  stock: number;
  lineTotal: number;
  weightGrams: number;
};

export type PricedCart = {
  lines: CartLine[];
  subtotal: number;
  totalWeightGrams: number;
  /** Human-readable problems to surface before checkout. */
  issues: string[];
};

export const EMPTY_CART: PricedCart = {
  lines: [],
  subtotal: 0,
  totalWeightGrams: 0,
  issues: [],
};
