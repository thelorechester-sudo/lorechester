import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Lorechester is an Indonesian clothing label making heavyweight cut-and-sew in limited runs.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <h1 className="text-headline font-black uppercase">About</h1>

      <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted">
        <p className="text-base text-ink">
          Lorechester is a clothing label from Indonesia. We make heavyweight
          cut-and-sew in short runs, print it ourselves, and sell it here.
        </p>
        <p>
          Every drop is capped. When a size sells out it usually stays sold out —
          we would rather move on to the next thing than reprint something twice.
          If you want to know when the next run lands, join the list on any
          product page.
        </p>
        <p>
          Orders ship from Bandung within one to two working days. We use JNE,
          J&amp;T and SiCepat; the exact cost is quoted from your address at
          checkout, so you never pay a padded flat rate.
        </p>
      </div>

      <hr className="my-12 border-line" />

      <h2 className="text-lg font-semibold tracking-tight">Get in touch</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Questions about an order, a size, or a restock — message us on WhatsApp
        or email and a person will answer.
      </p>

      <ul className="mt-6 space-y-2 text-sm">
        <li>
          <Link href="/orders/lookup" className="border-b border-ink pb-0.5">
            Track an order
          </Link>
        </li>
        <li>
          <Link href="/size-guide" className="border-b border-ink pb-0.5">
            Size guide
          </Link>
        </li>
        <li>
          <Link href="/shipping-returns" className="border-b border-ink pb-0.5">
            Shipping &amp; returns
          </Link>
        </li>
      </ul>
    </article>
  );
}
