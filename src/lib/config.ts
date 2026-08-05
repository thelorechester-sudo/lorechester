/**
 * Storefront constants read from NEXT_PUBLIC_* so the same value is available
 * on the server and in the browser without a second source of truth.
 */

/** Subtotal (rupiah) at which shipping becomes free. 0 disables the offer. */
export const FREE_SHIPPING_THRESHOLD =
  Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD) || 0;

export const SITE_NAME = "Lorechester";
