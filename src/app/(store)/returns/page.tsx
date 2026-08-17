import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Returns & exchanges",
  description:
    "How to exchange or return a Lorechester order, and what we do if something arrives wrong.",
};

export default function ReturnsPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <h1 className="text-headline font-semibold uppercase">
        Returns &amp; exchanges
      </h1>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted">
        <section>
          <p className="text-base text-ink">
            If we sent the wrong thing or it arrived damaged, that is on us and
            we fix it at our cost. If it simply does not fit, we will exchange
            it where we still have the size.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Our mistake or a faulty item
          </h2>
          <ul className="mt-3 space-y-2">
            <li>
              Send us a photo within <strong>48 hours</strong> of delivery.
            </li>
            <li>
              We replace it or refund you in full, and we pay the return
              shipping both ways.
            </li>
            <li>
              If we cannot replace it because the run has sold out, you get a
              full refund.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Wrong size
          </h2>
          <ul className="mt-3 space-y-2">
            <li>
              Exchanges accepted within <strong>7 days</strong> of delivery.
            </li>
            <li>
              Unworn and unwashed, tags attached, in a condition we could sell
              again.
            </li>
            <li>
              <strong className="text-ink">Message us before sending it.</strong>{" "}
              Runs are small — we need to hold the replacement size for you, and
              once a size is gone we cannot swap it.
            </li>
            <li>Return postage is yours; we cover sending the new one out.</li>
            <li>
              Check the{" "}
              <Link href="/size-guide" className="text-ink underline">
                size guide
              </Link>{" "}
              before ordering. Measuring a shirt you already own beats guessing.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            What we cannot take back
          </h2>
          <ul className="mt-3 space-y-2">
            <li>Worn or washed items.</li>
            <li>Items marked final sale at the time of purchase.</li>
            <li>Stickers and other small accessories.</li>
            <li>Anything returned without messaging us first.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Refunds
          </h2>
          <p className="mt-3">
            Refunds go back to the original payment method once we have received
            and checked the item. Banks usually take 3–14 working days to show
            it. Original shipping is only refunded when the fault was ours.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            How to start
          </h2>
          <p className="mt-3">
            Message <strong>[WHATSAPP NUMBER]</strong> or email{" "}
            <strong>[EMAIL]</strong> with your order number — it looks like{" "}
            <span className="tabular-nums">LCTR-7K3M9QDX</span>. You can find it on
            your{" "}
            <Link href="/orders/lookup" className="text-ink underline">
              order page
            </Link>
            .
          </p>
          <p className="mt-3">
            None of this limits your rights under Indonesian consumer protection
            law.
          </p>
        </section>
      </div>
    </article>
  );
}
