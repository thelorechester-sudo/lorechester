import type { Metadata } from "next";

import { isConfigured as isDokuConfigured } from "@/lib/doku";
import { getSiteSettings } from "@/lib/content";
import { isShippingConfigured } from "@/lib/shipping";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const site = await getSiteSettings();

  return (
    <>
      {!isDokuConfigured() && (
        <p className="mx-auto max-w-6xl px-5 pt-8 text-sm text-accent sm:px-8">
          Payments are not configured yet — set DOKU_CLIENT_ID and
          DOKU_SECRET_KEY in .env.local.
        </p>
      )}

      <CheckoutForm
        freeShippingThreshold={site.freeShippingThreshold}
        shippingConfigured={isShippingConfigured()}
      />
    </>
  );
}
