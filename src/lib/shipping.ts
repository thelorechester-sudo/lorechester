import "server-only";

import { optionalEnv } from "@/lib/env";

/**
 * Biteship — courier rates, area lookup and tracking for Indonesian shipping.
 *
 * Docs: https://biteship.com/id/docs/api
 *
 * When BITESHIP_API_KEY is absent the module degrades to a single flat-rate
 * option so checkout still works end to end in development.
 */

const BASE_URL = "https://api.biteship.com/v1";

/** Couriers quoted at checkout. Add more codes as you open accounts. */
const COURIERS = ["jne", "jnt", "sicepat", "anteraja", "ninja"].join(",");

/** Used only when Biteship is not configured. */
export const FALLBACK_SHIPPING_PRICE = 25_000;

export type ShippingArea = {
  id: string;
  name: string;
  postalCode: string;
};

export type ShippingOption = {
  /** Stable key: "jne:REG" */
  key: string;
  courier: string;
  courierName: string;
  service: string;
  serviceName: string;
  price: number;
  /** "2 - 3 days" */
  eta: string;
};

function apiKey(): string | undefined {
  return optionalEnv("BITESHIP_API_KEY");
}

export function isShippingConfigured(): boolean {
  return Boolean(apiKey() && optionalEnv("BITESHIP_ORIGIN_AREA_ID"));
}

async function biteship<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const key = apiKey();
  if (!key) return null;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: key,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(
      `Biteship ${path} failed: ${response.status} ${await response.text()}`,
    );
    return null;
  }

  return (await response.json()) as T;
}

/**
 * Autocomplete for the address form. Returns kelurahan-level areas, which is
 * the granularity Indonesian couriers price against.
 */
export async function searchAreas(query: string): Promise<ShippingArea[]> {
  if (query.trim().length < 3) return [];

  const data = await biteship<{
    areas: {
      id: string;
      name: string;
      postal_code: number | string;
    }[];
  }>(
    `/maps/areas?countries=ID&input=${encodeURIComponent(query)}&type=single`,
  );

  if (!data?.areas) return [];

  return data.areas.slice(0, 20).map((area) => ({
    id: area.id,
    name: area.name,
    postalCode: String(area.postal_code ?? ""),
  }));
}

export type RateRequest = {
  destinationAreaId: string;
  destinationPostalCode: string;
  /** Declared value in rupiah — used for insurance and some courier rules. */
  declaredValue: number;
  totalWeightGrams: number;
};

export async function getShippingOptions(
  request: RateRequest,
): Promise<ShippingOption[]> {
  const originAreaId = optionalEnv("BITESHIP_ORIGIN_AREA_ID");

  if (!apiKey() || !originAreaId) {
    return [
      {
        key: "flat:standard",
        courier: "flat",
        courierName: "Standard shipping",
        service: "standard",
        serviceName: "Nationwide",
        price: FALLBACK_SHIPPING_PRICE,
        eta: "2 - 4 days",
      },
    ];
  }

  const data = await biteship<{
    pricing?: {
      courier_code: string;
      courier_name: string;
      courier_service_code: string;
      courier_service_name: string;
      price: number;
      shipment_duration_range?: string;
      shipment_duration_unit?: string;
      duration?: string;
    }[];
  }>("/rates/couriers", {
    method: "POST",
    body: JSON.stringify({
      origin_area_id: originAreaId,
      origin_postal_code: optionalEnv("BITESHIP_ORIGIN_POSTAL_CODE"),
      destination_area_id: request.destinationAreaId,
      destination_postal_code: request.destinationPostalCode,
      couriers: COURIERS,
      items: [
        {
          name: "Apparel",
          description: "Lorechester order",
          value: request.declaredValue,
          // Couriers bill a 1 kg minimum; sending less just rounds up anyway.
          weight: Math.max(1000, request.totalWeightGrams),
          quantity: 1,
        },
      ],
    }),
  });

  if (!data?.pricing?.length) return [];

  return data.pricing
    .map((rate) => ({
      key: `${rate.courier_code}:${rate.courier_service_code}`,
      courier: rate.courier_code,
      courierName: rate.courier_name,
      service: rate.courier_service_code,
      serviceName: rate.courier_service_name,
      price: Math.round(rate.price),
      eta:
        rate.duration ??
        (rate.shipment_duration_range
          ? `${rate.shipment_duration_range} ${rate.shipment_duration_unit ?? "days"}`
          : "—"),
    }))
    .sort((a, b) => a.price - b.price);
}

/**
 * Re-quote a single option server-side at order time.
 *
 * The browser tells us which option the customer picked; we look the price up
 * again rather than trusting the number it sends back.
 */
export async function priceShippingOption(
  request: RateRequest,
  optionKey: string,
): Promise<ShippingOption | null> {
  const options = await getShippingOptions(request);
  return options.find((option) => option.key === optionKey) ?? null;
}
