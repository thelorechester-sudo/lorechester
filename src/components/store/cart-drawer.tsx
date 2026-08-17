"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { getCartLines } from "@/app/actions/cart";
import { EMPTY_CART, type PricedCart } from "@/lib/cart-types";
import { formatIDR } from "@/lib/money";
import { useCart } from "./cart-store";

export function CartDrawer({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const { items, isOpen, close, setQty, remove, hydrated } = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [priced, setCart] = useState<PricedCart>(EMPTY_CART);
  const [pending, startTransition] = useTransition();

  /*
   * Native <dialog> gives focus trapping, Esc-to-close and an inert background
   * for free. Reimplementing those correctly is a lot of code to get wrong.
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Re-price whenever the bag changes. Prices and stock come from the server,
  // never from what was stored in the browser.
  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    startTransition(async () => {
      setCart(await getCartLines(items));
    });
  }, [items, hydrated]);

  // Derived rather than stored: an empty bag has nothing to price, and keeping
  // it out of state avoids a setState-in-effect round trip.
  const cart = items.length === 0 ? EMPTY_CART : priced;

  const remaining = freeShippingThreshold - cart.subtotal;
  const qualifies = freeShippingThreshold > 0 && remaining <= 0;

  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      aria-label="Shopping bag"
      className="ml-auto h-full max-h-none w-full max-w-md bg-paper-pure p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="meta">
            Your bag{cart.lines.length > 0 && ` (${cart.lines.length})`}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close bag"
            className="p-1 text-lg leading-none"
          >
            ✕
          </button>
        </header>

        {cart.issues.length > 0 && (
          <ul className="space-y-1 border-b border-line bg-accent-soft px-5 py-3">
            {cart.issues.map((issue) => (
              <li key={issue} className="text-xs text-accent">
                {issue}
              </li>
            ))}
          </ul>
        )}

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
            <p className="text-muted">
              {pending ? "Loading…" : "Your bag is empty."}
            </p>
            <Link
              href="/shop"
              onClick={close}
              className="meta border-b border-ink pb-1"
            >
              Shop all
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {cart.lines.map((line) => (
                <li key={line.variantId} className="flex gap-4 py-4">
                  <Link
                    href={`/product/${line.slug}`}
                    onClick={close}
                    className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-input bg-paper"
                  >
                    {line.image && (
                      <Image
                        src={line.image}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/product/${line.slug}`}
                      onClick={close}
                      className="text-sm font-medium tracking-tight hover:underline"
                    >
                      {line.title}
                    </Link>
                    <p className="meta mt-1 text-muted">
                      {line.size}
                      {line.color ? ` · ${line.color}` : ""}
                    </p>

                    {line.stock === 0 ? (
                      <p className="mt-1 text-xs font-medium text-accent">
                        Sold out
                      </p>
                    ) : (
                      line.stock <= 3 && (
                        <p className="mt-1 text-xs text-accent">
                          Only {line.stock} left
                        </p>
                      )
                    )}

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-input border border-line">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${line.title}`}
                          onClick={() => setQty(line.variantId, line.qty - 1)}
                          className="px-2.5 py-1 text-sm hover:bg-paper"
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center text-sm tabular-nums">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${line.title}`}
                          disabled={line.qty >= line.stock}
                          onClick={() => setQty(line.variantId, line.qty + 1)}
                          className="px-2.5 py-1 text-sm hover:bg-paper disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      <span className="tabular-nums text-sm">
                        {formatIDR(line.unitPrice * line.qty)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={`Remove ${line.title} from bag`}
                    onClick={() => remove(line.variantId)}
                    className="self-start p-1 text-xs text-muted hover:text-accent"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            <footer className="border-t border-line px-5 py-4">
              {freeShippingThreshold > 0 && (
                <p className="meta mb-3 text-muted">
                  {qualifies
                    ? "✓ Free shipping unlocked"
                    : `${formatIDR(remaining)} away from free shipping`}
                </p>
              )}

              <div className="flex items-baseline justify-between">
                <span className="meta text-muted">Subtotal</span>
                <span className="tabular-nums text-lg">{formatIDR(cart.subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Shipping calculated at checkout.
              </p>

              <Link
                href="/checkout"
                onClick={close}
                aria-disabled={cart.subtotal === 0}
                className={
                  "mt-4 flex h-12 items-center justify-center rounded-button bg-ink text-paper transition-colors hover:bg-ink-soft " +
                  (cart.subtotal === 0 ? "pointer-events-none opacity-40" : "")
                }
              >
                <span className="meta">Checkout</span>
              </Link>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}
