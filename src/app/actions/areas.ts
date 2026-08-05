"use server";

import { searchAreas, type ShippingArea } from "@/lib/shipping";

/**
 * Address autocomplete for the checkout form.
 *
 * Indonesian couriers price against kelurahan-level areas, so the customer
 * picks from this list rather than typing a city freehand — a typo here means
 * an unquotable, undeliverable address.
 */
export async function lookupAreas(query: string): Promise<ShippingArea[]> {
  if (typeof query !== "string") return [];
  return searchAreas(query);
}
