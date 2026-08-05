"use client";

import { useState } from "react";

import { formatIDR } from "@/lib/money";
import { useCart } from "./cart-store";
import { NotifyMe } from "./notify-me";

export type PickerVariant = {
  id: string;
  size: string;
  color: string | null;
  stock: number;
  price: number;
};

export function AddToCart({
  variants,
  basePrice,
  productId,
}: {
  variants: PickerVariant[];
  basePrice: number;
  productId: string;
}) {
  const { add, items } = useCart();

  const firstAvailable = variants.find((variant) => variant.stock > 0);
  const [selectedId, setSelectedId] = useState<string | null>(
    // Preselect only when there is exactly one size — otherwise force a choice,
    // which is what stops "wrong size" returns.
    variants.length === 1 ? (firstAvailable?.id ?? null) : null,
  );
  const [error, setError] = useState<string | null>(null);

  const selected = variants.find((variant) => variant.id === selectedId) ?? null;
  const inBag = selected
    ? (items.find((item) => item.variantId === selected.id)?.qty ?? 0)
    : 0;
  const atLimit = selected ? inBag >= selected.stock : false;
  const allSoldOut = variants.every((variant) => variant.stock === 0);

  function handleAdd() {
    if (!selected) {
      setError("Choose a size first.");
      return;
    }
    if (atLimit) {
      setError(`That's all we have — ${selected.stock} in your bag already.`);
      return;
    }
    setError(null);
    add(selected.id, 1);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="meta text-muted">Size</span>
          {selected && selected.stock > 0 && selected.stock <= 3 && (
            <span className="meta text-accent">
              Only {selected.stock} left
            </span>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label="Size"
          className="mt-2 flex flex-wrap gap-2"
        >
          {variants.map((variant) => {
            const soldOut = variant.stock === 0;
            const isSelected = variant.id === selectedId;

            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${variant.size}${soldOut ? ", sold out — get a restock alert" : ""}`}
                // Sold-out sizes stay selectable on purpose: choosing one opens
                // the restock form, which is the whole point of the waitlist.
                onClick={() => {
                  setSelectedId(variant.id);
                  setError(null);
                }}
                className={
                  "min-w-14 border px-4 py-2.5 text-sm transition-colors " +
                  (soldOut
                    ? isSelected
                      ? "border-ink text-muted line-through"
                      : "border-line text-muted/40 line-through hover:border-muted"
                    : isSelected
                      ? "border-ink bg-ink text-paper"
                      : "border-line hover:border-ink")
                }
              >
                {variant.size}
              </button>
            );
          })}
        </div>
      </div>

      {selected && selected.price !== basePrice && (
        <p className="meta text-muted">
          {selected.size} — {formatIDR(selected.price)}
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-accent">
          {error}
        </p>
      )}

      {selected && selected.stock === 0 ? (
        <div className="border-t border-line pt-4">
          <p className="text-sm font-medium">
            {selected.size} is sold out.
          </p>
          <p className="mb-3 mt-1 text-xs leading-relaxed text-muted">
            Leave your details and we&apos;ll message you first if it comes
            back. Runs are limited, so this is often the only way to get one.
          </p>
          <NotifyMe
            productId={productId}
            variantId={selected.id}
            label="Notify me"
          />
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleAdd}
            disabled={allSoldOut}
            className="flex h-13 w-full items-center justify-center bg-ink py-4 text-paper transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:bg-muted"
          >
            <span className="meta">
              {allSoldOut
                ? "Sold out"
                : atLimit
                  ? "All in your bag"
                  : "Add to bag"}
            </span>
          </button>

          {inBag > 0 && (
            <p className="meta text-center text-muted">{inBag} in your bag</p>
          )}
        </>
      )}

      {allSoldOut && !selected && (
        <div className="border-t border-line pt-4">
          <p className="mb-3 text-xs leading-relaxed text-muted">
            Every size is gone. Get on the list and we&apos;ll tell you if it
            returns.
          </p>
          <NotifyMe productId={productId} label="Notify me" />
        </div>
      )}
    </div>
  );
}
