import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms you agree to when ordering from Lorechester.",
};

/**
 * Payment providers ask to see this page before approving a production
 * account, and Indonesian consumer law (UU No. 8/1999) expects published
 * terms. Replace the bracketed placeholders with your real business details —
 * a payment provider will check that they match your registration.
 */
export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <h1 className="text-headline font-black uppercase">Terms of service</h1>
      <p className="mt-4 text-xs text-muted">Last updated: 5 August 2026</p>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Who you are buying from
          </h2>
          <p className="mt-3">
            This store is operated by <strong>[LEGAL BUSINESS NAME]</strong>,
            registered at <strong>[BUSINESS ADDRESS]</strong>, Indonesia.
            Business registration number <strong>[NIB / NPWP]</strong>. Contact:{" "}
            <strong>[EMAIL]</strong> and <strong>[WHATSAPP NUMBER]</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Orders and prices
          </h2>
          <ul className="mt-3 space-y-2">
            <li>
              All prices are in Indonesian Rupiah and include applicable tax.
            </li>
            <li>
              An order is a request to buy. It is accepted only once payment
              clears — until then we may decline it, for example if an item
              sells out while you are paying.
            </li>
            <li>
              The price charged is the price calculated by our server at
              checkout. If a price is displayed incorrectly, we will contact you
              before shipping rather than silently charging a different amount.
            </li>
            <li>
              Stock is limited and not reserved while an item sits in your bag.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Payment
          </h2>
          <p className="mt-3">
            Payments are processed by Midtrans. We never see or store your card
            number. An order is only confirmed when Midtrans tells us the
            payment settled; closing the payment window does not complete an
            order. Unpaid orders expire after 24 hours.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Delivery
          </h2>
          <p className="mt-3">
            We ship across Indonesia via JNE, J&amp;T and SiCepat. Delivery
            estimates come from the courier and are not guarantees. Risk passes
            to you on delivery. Full detail is on the{" "}
            <Link href="/shipping-returns" className="text-ink underline">
              shipping page
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Returns
          </h2>
          <p className="mt-3">
            Your rights are set out on the{" "}
            <Link href="/returns" className="text-ink underline">
              returns page
            </Link>
            . Nothing in these terms limits rights you have under Indonesian
            consumer protection law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Our designs
          </h2>
          <p className="mt-3">
            The Lorechester name, marks and print artwork belong to us. Buying a
            garment does not transfer any right to reproduce the artwork.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Liability
          </h2>
          <p className="mt-3">
            Our liability for any order is limited to what you paid for it. We
            are not liable for delays caused by couriers, payment providers or
            events outside our control.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Governing law
          </h2>
          <p className="mt-3">
            These terms are governed by the laws of the Republic of Indonesia.
          </p>
        </section>
      </div>
    </article>
  );
}
