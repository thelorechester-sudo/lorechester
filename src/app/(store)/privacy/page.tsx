import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Lorechester collects, why, and who it is shared with.",
};

/**
 * Describes what this codebase actually does. If you change the integrations
 * (add a new processor, drop Fonnte, turn off the Meta Pixel), update this
 * page — an inaccurate privacy policy is worse than none.
 */
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <h1 className="text-headline font-semibold uppercase">Privacy policy</h1>
      <p className="mt-4 text-xs text-muted">Last updated: 5 August 2026</p>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted">
        <section>
          <p className="text-base text-ink">
            We collect what is needed to send you a parcel and nothing beyond
            it. We do not sell your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            What we collect
          </h2>
          <ul className="mt-3 space-y-2">
            <li>
              <strong className="text-ink">To fulfil an order:</strong> name,
              email, WhatsApp number, delivery address, and what you bought. We
              keep this as a record of the sale.
            </li>
            <li>
              <strong className="text-ink">If you join a waitlist:</strong> your
              email, and your WhatsApp number if you give one. Used only to tell
              you about that item or the next drop.
            </li>
            <li>
              <strong className="text-ink">Automatically:</strong> standard
              server logs, and analytics if you accept them.
            </li>
          </ul>
          <p className="mt-3">
            We never see or store your card details — those go straight to
            Midtrans.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Who it is shared with
          </h2>
          <ul className="mt-3 space-y-2">
            <li>
              <strong className="text-ink">Midtrans</strong> — payment
              processing. Receives your name, email, phone and order total.
            </li>
            <li>
              <strong className="text-ink">Biteship and the courier</strong> —
              shipping. Receives the delivery name, address and phone.
            </li>
            <li>
              <strong className="text-ink">Fonnte</strong> — sends the WhatsApp
              order updates.
            </li>
            <li>
              <strong className="text-ink">Resend</strong> — sends order emails.
            </li>
            <li>
              <strong className="text-ink">Supabase and Vercel</strong> —
              database and hosting.
            </li>
            <li>
              <strong className="text-ink">
                Google Analytics and Meta Pixel
              </strong>{" "}
              — traffic measurement and advertising. These set cookies and can
              build a profile across sites. Block them with your browser or an
              ad blocker if you prefer; the store works without them.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            How long we keep it
          </h2>
          <p className="mt-3">
            Order records are kept while we are required to for tax and
            accounting. Waitlist entries are kept until you ask to be removed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Your choices
          </h2>
          <ul className="mt-3 space-y-2">
            <li>Reply STOP to any WhatsApp message to stop receiving them.</li>
            <li>
              Message or email us to see, correct or delete what we hold. We may
              need to keep completed order records for tax reasons.
            </li>
          </ul>
          <p className="mt-3">
            Contact <strong>[EMAIL]</strong> or <strong>[WHATSAPP NUMBER]</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Security
          </h2>
          <p className="mt-3">
            The site runs over HTTPS. Our database is not readable from the
            public internet, order pages use unguessable references, and card
            data never touches our servers. No system is perfect, but we do not
            store what we do not need.
          </p>
        </section>
      </div>
    </article>
  );
}
