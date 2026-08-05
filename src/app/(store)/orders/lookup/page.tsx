import type { Metadata } from "next";

import { LookupForm } from "./lookup-form";

export const metadata: Metadata = {
  title: "Track an order",
  description: "Look up a Lorechester order with your email and order number.",
  robots: { index: false, follow: false },
};

export default function LookupPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-20 sm:px-8">
      <h1 className="text-headline font-black uppercase">Track an order</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Enter the email you ordered with and your order number — it looks like
        <span className="font-mono"> LCTR-7K3M9QDX</span> and is in your
        confirmation message.
      </p>
      <LookupForm />
    </div>
  );
}
