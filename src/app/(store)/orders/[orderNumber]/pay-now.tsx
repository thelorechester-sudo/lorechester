/** Reopen the DOKU Checkout page for an order that was left unpaid. */
export function PayNowButton({ paymentUrl }: { paymentUrl: string }) {
  return (
    <a
      href={paymentUrl}
      className="mt-4 flex h-12 w-full items-center justify-center rounded-button bg-ink text-paper transition-colors hover:bg-ink-soft"
    >
      <span className="meta">Pay now</span>
    </a>
  );
}
