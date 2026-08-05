import { percentOf } from "@/lib/money";

/**
 * Pure order arithmetic. No database, no network — so it is cheap to test and
 * the same function can render an estimate in the browser and compute the
 * authoritative total on the server.
 *
 * Every value is an integer number of rupiah.
 */

export type DiscountRule = {
  type: "percent" | "fixed";
  value: number;
  minSubtotal: number;
};

export type Totals = {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
  /** True when the free-shipping threshold zeroed the courier charge. */
  freeShippingApplied: boolean;
};

/**
 * How much a rule takes off a given subtotal.
 * Never exceeds the subtotal — a discount must not turn into store credit.
 */
export function discountAmount(rule: DiscountRule, subtotal: number): number {
  if (subtotal < rule.minSubtotal) return 0;

  const raw =
    rule.type === "percent"
      ? percentOf(subtotal, Math.min(rule.value, 100))
      : rule.value;

  return Math.max(0, Math.min(raw, subtotal));
}

export function computeTotals({
  subtotal,
  discount,
  shippingPrice,
  freeShippingThreshold,
}: {
  subtotal: number;
  discount: DiscountRule | null;
  shippingPrice: number;
  freeShippingThreshold: number;
}): Totals {
  const discountTotal = discount ? discountAmount(discount, subtotal) : 0;
  const afterDiscount = subtotal - discountTotal;

  /*
   * The threshold is measured AFTER the discount. Measuring it before would
   * let a large coupon buy free shipping on a small order.
   */
  const freeShippingApplied =
    freeShippingThreshold > 0 &&
    afterDiscount >= freeShippingThreshold &&
    shippingPrice > 0;

  const shippingTotal = freeShippingApplied ? 0 : shippingPrice;

  return {
    subtotal,
    discountTotal,
    shippingTotal,
    grandTotal: afterDiscount + shippingTotal,
    freeShippingApplied,
  };
}
