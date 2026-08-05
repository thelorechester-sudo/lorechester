/**
 * Money helpers. Every amount in this app is an integer number of rupiah —
 * there is no minor unit, and Midtrans rejects fractional gross_amount.
 */

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 498000 -> "Rp 498.000" */
export function formatIDR(amount: number): string {
  // Intl emits U+00A0 after "Rp"; normalise to a plain space so it wraps and
  // matches in tests.
  return idr.format(amount).replace(/ /g, " ");
}

/** 498000 -> "498.000" (for places where the design shows the symbol separately) */
export function formatIDRPlain(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}

/**
 * Apply a percentage, rounding to whole rupiah. Rounding happens once, here —
 * never accumulate fractional rupiah across line items.
 */
export function percentOf(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}
