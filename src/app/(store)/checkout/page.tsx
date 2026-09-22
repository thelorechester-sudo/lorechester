import type { Metadata } from "next";

import { isConfigured as isDokuConfigured } from "@/lib/doku";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/config";
import { isShippingConfigured } from "@/lib/shipping";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <>
      {!isDokuConfigured() && (
        <p className="mx-auto max-w-6xl px-5 pt-8 text-sm text-accent sm:px-8">
          Payments are not configured yet — set DOKU_CLIENT_ID and
          DOKU_SECRET_KEY in .env.local.
        </p>
      )}

      <CheckoutForm
        freeShippingThreshold={FREE_SHIPPING_THRESHOLD}
        shippingConfigured={isShippingConfigured()}
      />
    </>
  );
}
