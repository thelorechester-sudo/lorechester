import type { Metadata } from "next";

import { FREE_SHIPPING_THRESHOLD } from "@/lib/config";
import { formatIDR } from "@/lib/money";

export const metadata: Metadata = {
  title: "Shipping & returns",
  description:
    "How Lorechester orders are shipped across Indonesia, and how exchanges work.",
};

export default function ShippingReturnsPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <h1 className="text-headline font-black uppercase">
        Shipping &amp; returns
      </h1>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Shipping</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          <li>
            Orders are packed and handed to the courier within 1–2 working days
            of payment clearing.
          </li>
          <li>
            We ship nationwide with JNE, J&amp;T and SiCepat. You pick the
            courier at checkout and the price is quoted live from your address —
            no flat rate, no padding.
          </li>
          {FREE_SHIPPING_THRESHOLD > 0 && (
            <li>
              Shipping is free on orders over{" "}
              {formatIDR(FREE_SHIPPING_THRESHOLD)}.
            </li>
          )}
          <li>
            A tracking number is sent to your WhatsApp as soon as the parcel
            leaves us.
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">Exchanges</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          <li>
            Unworn, unwashed items with tags attached can be exchanged within 7
            days of delivery.
          </li>
          <li>
            Message us first so we can hold the size you want — stock is limited
            and we cannot guarantee a swap once a size is gone.
          </li>
          <li>
            Return shipping is on you unless the item arrived faulty or we sent
            the wrong thing, in which case we cover it both ways.
          </li>
          <li>
            Sale items and items marked final sale cannot be exchanged.
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">Faulty items</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          If something arrives damaged, send us a photo within 48 hours of
          delivery and we will replace it or refund you in full.
        </p>
      </section>
    </article>
  );
}
