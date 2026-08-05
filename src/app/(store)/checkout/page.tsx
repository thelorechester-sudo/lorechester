import type { Metadata } from "next";
import Script from "next/script";

import { FREE_SHIPPING_THRESHOLD } from "@/lib/config";
import { clientKey, snapScriptUrl } from "@/lib/midtrans";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  const key = clientKey();

  return (
    <>
      {key && (
        // Snap's popup script. `data-client-key` is a publishable key — the
        // server key never reaches the browser.
        <Script src={snapScriptUrl()} data-client-key={key} strategy="afterInteractive" />
      )}

      {!key && (
        <p className="mx-auto max-w-6xl px-5 pt-8 text-sm text-accent sm:px-8">
          Payments are not configured yet — set NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
          and MIDTRANS_SERVER_KEY in .env.local.
        </p>
      )}

      <CheckoutForm freeShippingThreshold={FREE_SHIPPING_THRESHOLD} />
    </>
  );
}
