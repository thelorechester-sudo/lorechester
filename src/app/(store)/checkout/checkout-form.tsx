"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { lookupAreas } from "@/app/actions/areas";
import {
  createOrder,
  previewDiscount,
  quoteShipping,
  type CheckoutState,
} from "@/app/actions/checkout";
import { getCartLines } from "@/app/actions/cart";
import { useCart } from "@/components/store/cart-store";
import { RegionSelect } from "@/components/store/region-select";
import { EMPTY_CART, type PricedCart } from "@/lib/cart-types";
import { PROVINCES, REGENCIES_BY_PROVINCE, type Region } from "@/lib/indonesia-regions";
import { formatIDR } from "@/lib/money";
import type { ShippingArea, ShippingOption } from "@/lib/shipping";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

const inputClass =
  "w-full border border-line bg-paper-pure px-3 py-2.5 text-sm outline-none focus:border-ink";

function Row({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="meta block text-muted">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

function PayButton({ total }: { total: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || total <= 0}
      className="flex h-13 w-full items-center justify-center bg-ink py-4 text-paper transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:bg-muted"
    >
      <span className="meta">
        {pending ? "Preparing payment…" : `Pay ${formatIDR(total)}`}
      </span>
    </button>
  );
}

export function CheckoutForm({
  freeShippingThreshold,
  shippingConfigured,
}: {
  freeShippingThreshold: number;
  /**
   * False in local/demo setups with no Biteship account. Courier rate
   * lookups fall back to a flat price either way (see lib/shipping.ts), but
   * that fallback still needs *some* area to quote against — so without a
   * real account to search against, the typed district stands in directly
   * rather than requiring a pick from an autocomplete that can never return
   * results.
   */
  shippingConfigured: boolean;
}) {
  const router = useRouter();
  const { items, hydrated, clear } = useCart();
  const [state, formAction] = useActionState<CheckoutState, FormData>(
    createOrder,
    { ok: false },
  );

  const [priced, setCart] = useState<PricedCart>(EMPTY_CART);
  const [, startCartTransition] = useTransition();

  const [province, setProvince] = useState<Region | null>(null);
  const [city, setCity] = useState<Region | null>(null);
  const cityOptions = province ? (REGENCIES_BY_PROVINCE[province.id] ?? []) : [];

  const [form, setForm] = useState({
    email: "",
    phone: "",
    recipientName: "",
    line1: "",
    postalCode: "",
    note: "",
  });

  const [areaQuery, setAreaQuery] = useState("");
  const [fetchedAreas, setFetchedAreas] = useState<ShippingArea[]>([]);
  const [area, setArea] = useState<ShippingArea | null>(null);
  const [areaLoading, startAreaTransition] = useTransition();

  const [quoted, setQuoted] = useState<ShippingOption[]>([]);
  const [optionKey, setOptionKey] = useState("");
  const [shippingLoading, startShippingTransition] = useTransition();

  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; amount: number } | null>(
    null,
  );
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codePending, startCodeTransition] = useTransition();

  const errors = state.errors ?? {};

  /* Live cart pricing ----------------------------------------------------- */
  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    startCartTransition(async () => {
      setCart(await getCartLines(items));
    });
  }, [items, hydrated]);

  // Derived, not stored — see the same note in cart-drawer.tsx.
  const cart = items.length === 0 ? EMPTY_CART : priced;

  /* Area autocomplete, debounced — only meaningful with a real account to
     search against; see the shippingConfigured prop doc above. */
  const canSearchArea =
    shippingConfigured && area === null && areaQuery.trim().length >= 3;

  useEffect(() => {
    if (!canSearchArea) return;
    const timer = setTimeout(() => {
      startAreaTransition(async () => {
        setFetchedAreas(await lookupAreas(areaQuery));
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [canSearchArea, areaQuery]);

  // Derived so a picked district or a cleared box hides results immediately,
  // without a second render to empty them out.
  const areaResults = canSearchArea ? fetchedAreas : [];

  // Province and city are always collected — a real address needs them
  // regardless of whether Biteship can price it — but only get folded into
  // the label here when there is no account to validate a district against.
  // Biteship's own search result already carries the full "District, City,
  // Province" hierarchy in its name, matching the shape documented on
  // ShippingAddress.areaLabel in db/schema.ts.
  const effectiveArea: ShippingArea | null = shippingConfigured
    ? area
    : areaQuery.trim() && province && city
      ? {
          id: "manual",
          name: `${areaQuery.trim()}, ${city.name}, ${province.name}`,
          postalCode: form.postalCode,
        }
      : null;

  /* Courier rates, refreshed whenever the destination or bag changes ------ */
  const canQuote =
    effectiveArea !== null &&
    province !== null &&
    city !== null &&
    /^\d{5}$/.test(form.postalCode) &&
    items.length > 0;

  useEffect(() => {
    if (!canQuote || !effectiveArea) return;

    let cancelled = false;
    const areaId = effectiveArea.id;
    const postalCode = form.postalCode;

    startShippingTransition(async () => {
      const result = await quoteShipping({ areaId, postalCode, items });
      // The address changed while this quote was in flight — drop the stale
      // rates rather than showing prices for the previous destination.
      if (cancelled) return;

      setQuoted(result.options);
      setOptionKey((current) =>
        result.options.some((option) => option.key === current)
          ? current
          : (result.options[0]?.key ?? ""),
      );
    });

    return () => {
      cancelled = true;
    };
    // effectiveArea is a fresh object every render in manual mode (no
    // shippingConfigured), and quoteShipping returns a fresh array on every
    // call — depending on the object itself would refire this on every
    // render, forever. areaId/name is everything the request actually uses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canQuote, effectiveArea?.id, effectiveArea?.name, form.postalCode, items]);

  // Derived: an incomplete address has no options, rather than stale ones
  // hanging around until an effect clears them.
  const options = canQuote ? quoted : [];

  /* Open the Snap popup once the server hands back a token ---------------- */
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!state.ok || !state.token || !state.orderNumber) return;
    if (handled.current === state.token) return;
    handled.current = state.token;

    const orderUrl = `/orders/${state.orderNumber}`;

    if (!window.snap) {
      // Script blocked or still loading — the order exists, so send them to
      // the order page where they can retry rather than losing it.
      router.push(orderUrl);
      return;
    }

    window.snap.pay(state.token, {
      onSuccess: () => {
        clear();
        router.push(`${orderUrl}?paid=1`);
      },
      onPending: () => {
        clear();
        router.push(orderUrl);
      },
      onError: () => router.push(orderUrl),
      onClose: () => router.push(orderUrl),
    });
  }, [state, router, clear]);

  /* Totals ---------------------------------------------------------------- */
  const chosen = options.find((option) => option.key === optionKey) ?? null;
  const discountTotal = applied?.amount ?? 0;
  const afterDiscount = cart.subtotal - discountTotal;
  const freeShipping =
    freeShippingThreshold > 0 &&
    afterDiscount >= freeShippingThreshold &&
    (chosen?.price ?? 0) > 0;
  const shippingTotal = freeShipping ? 0 : (chosen?.price ?? 0);
  const grandTotal = afterDiscount + shippingTotal;

  const payload = JSON.stringify({
    ...form,
    areaId: effectiveArea?.id ?? "",
    areaLabel: effectiveArea?.name ?? "",
    shippingOptionKey: optionKey,
    discountCode: applied?.code,
    items,
  });

  if (hydrated && items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="text-headline font-black uppercase">Your bag is empty</h1>
        <Link href="/shop" className="meta mt-6 inline-block border-b border-ink pb-1">
          Shop all
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="mx-auto grid max-w-6xl gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_24rem]"
    >
      <input type="hidden" name="payload" value={payload} />

      {/* ---------------------------------------------------------------- */}
      <div className="space-y-10">
        <h1 className="text-headline font-black uppercase">Checkout</h1>

        {errors._form && (
          <p
            role="alert"
            className="border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
          >
            {errors._form}
          </p>
        )}

        {cart.issues.length > 0 && (
          <ul className="space-y-1 border border-accent/30 bg-accent-soft px-4 py-3">
            {cart.issues.map((issue) => (
              <li key={issue} className="text-xs text-accent">
                {issue}
              </li>
            ))}
          </ul>
        )}

        <section className="space-y-4">
          <h2 className="meta border-b border-line pb-2">1 — Contact</h2>

          <Row label="Email" htmlFor="email" error={errors.email}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Row>

          <Row
            label="WhatsApp number"
            htmlFor="phone"
            error={errors.phone}
            hint="Order updates and your tracking number are sent here."
          >
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="0812 3456 7890"
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Row>
        </section>

        <section className="space-y-4">
          <h2 className="meta border-b border-line pb-2">2 — Delivery address</h2>

          <Row label="Recipient name" htmlFor="recipientName" error={errors.recipientName}>
            <input
              id="recipientName"
              autoComplete="name"
              required
              className={inputClass}
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
            />
          </Row>

          <Row
            label="Street address"
            htmlFor="line1"
            error={errors.line1}
            hint="Street, number, RT/RW, and any landmark that helps the courier."
          >
            <textarea
              id="line1"
              rows={3}
              autoComplete="street-address"
              required
              className={inputClass}
              value={form.line1}
              onChange={(e) => setForm({ ...form, line1: e.target.value })}
            />
          </Row>

          <RegionSelect
            id="province"
            label="Province"
            placeholder="Select province"
            options={PROVINCES}
            value={province}
            onChange={(next) => {
              setProvince(next);
              setCity(null);
            }}
          />

          <RegionSelect
            id="city"
            label="City / Regency"
            placeholder="Select city or regency"
            disabledHint="Select a province first"
            options={cityOptions}
            value={city}
            onChange={setCity}
          />

          <Row
            label="District"
            htmlFor="area"
            error={errors.areaId}
            hint={
              shippingConfigured
                ? "Type your kecamatan or kelurahan and pick from the list."
                : "Kecamatan or kelurahan."
            }
          >
            {shippingConfigured && area ? (
              <div className="flex items-center justify-between gap-3 border border-ink bg-paper px-3 py-2.5">
                <span className="text-sm">{area.name}</span>
                <button
                  type="button"
                  className="meta text-accent"
                  onClick={() => {
                    setArea(null);
                    setAreaQuery("");
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  id="area"
                  className={inputClass}
                  placeholder="e.g. Kebayoran Baru"
                  value={areaQuery}
                  onChange={(e) => setAreaQuery(e.target.value)}
                  autoComplete="off"
                />
                {shippingConfigured && areaLoading && (
                  <p className="mt-1 text-xs text-muted">Searching…</p>
                )}
                {shippingConfigured && areaResults.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto border border-line bg-paper-pure shadow-lg">
                    {areaResults.map((result) => (
                      <li key={result.id}>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                          onClick={() => {
                            // Setting the area makes canSearchArea false,
                            // which empties areaResults on its own.
                            setArea(result);
                            if (result.postalCode) {
                              setForm((prev) => ({
                                ...prev,
                                postalCode: result.postalCode,
                              }));
                            }
                          }}
                        >
                          {result.name}
                          {result.postalCode && (
                            <span className="ml-2 text-xs text-muted">
                              {result.postalCode}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Row>

          <Row label="Postal code" htmlFor="postalCode" error={errors.postalCode}>
            <input
              id="postalCode"
              inputMode="numeric"
              maxLength={5}
              required
              className={`${inputClass} max-w-32`}
              value={form.postalCode}
              onChange={(e) =>
                setForm({
                  ...form,
                  postalCode: e.target.value.replace(/\D/g, "").slice(0, 5),
                })
              }
            />
          </Row>

          <Row label="Delivery note (optional)" htmlFor="note" error={errors.note}>
            <input
              id="note"
              className={inputClass}
              placeholder="Leave with the security post, etc."
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </Row>
        </section>

        <section className="space-y-4">
          <h2 className="meta border-b border-line pb-2">3 — Shipping</h2>

          {!effectiveArea || !/^\d{5}$/.test(form.postalCode) ? (
            <p className="text-sm text-muted">
              Fill in your province, city, district and postal code to see
              courier options.
            </p>
          ) : shippingLoading ? (
            <p className="text-sm text-muted">Getting courier rates…</p>
          ) : options.length === 0 ? (
            <p className="text-sm text-accent">
              No couriers available for that address. Double-check the district,
              or message us and we&apos;ll arrange it manually.
            </p>
          ) : (
            <ul className="space-y-2">
              {options.map((option) => (
                <li key={option.key}>
                  <label
                    className={
                      "flex cursor-pointer items-center gap-3 border px-4 py-3 transition-colors " +
                      (optionKey === option.key
                        ? "border-ink bg-paper"
                        : "border-line hover:border-muted")
                    }
                  >
                    <input
                      type="radio"
                      name="shippingOption"
                      className="size-4 accent-[var(--color-ink)]"
                      checked={optionKey === option.key}
                      onChange={() => setOptionKey(option.key)}
                    />
                    <span className="flex-1 text-sm">
                      {option.courierName}{" "}
                      <span className="text-muted">{option.serviceName}</span>
                      <span className="meta ml-2 text-muted">{option.eta}</span>
                    </span>
                    <span className="font-mono text-sm">
                      {formatIDR(option.price)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {errors.shippingOptionKey && (
            <p role="alert" className="text-xs text-accent">
              {errors.shippingOptionKey}
            </p>
          )}
        </section>
      </div>

      {/* Summary --------------------------------------------------------- */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="border border-line bg-paper-pure p-5">
          <h2 className="meta border-b border-line pb-3 text-muted">
            Order summary
          </h2>

          <ul className="divide-y divide-line">
            {cart.lines.map((line) => (
              <li key={line.variantId} className="flex gap-3 py-3">
                <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden bg-paper">
                  {line.image && (
                    <Image
                      src={line.image}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{line.title}</p>
                  <p className="meta text-muted">
                    {line.size} · ×{line.qty}
                  </p>
                </div>
                <span className="font-mono text-sm">
                  {formatIDR(line.unitPrice * line.qty)}
                </span>
              </li>
            ))}
          </ul>

          {/* Discount ---------------------------------------------------- */}
          <div className="border-t border-line pt-4">
            {applied ? (
              <div className="flex items-center justify-between text-sm">
                <span>
                  Code <strong>{applied.code}</strong> applied
                </span>
                <button
                  type="button"
                  className="meta text-accent"
                  onClick={() => {
                    setApplied(null);
                    setCodeInput("");
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  aria-label="Discount code"
                  placeholder="Discount code"
                  className={inputClass}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                />
                <button
                  type="button"
                  disabled={codePending || !codeInput.trim()}
                  className="meta shrink-0 border border-ink px-4 disabled:opacity-40"
                  onClick={() =>
                    startCodeTransition(async () => {
                      setCodeError(null);
                      const result = await previewDiscount(codeInput, items);
                      if (result.ok) {
                        setApplied({
                          code: result.code,
                          amount: result.discountTotal,
                        });
                      } else {
                        setCodeError(result.error);
                      }
                    })
                  }
                >
                  {codePending ? "…" : "Apply"}
                </button>
              </div>
            )}
            {(codeError || errors.discountCode) && (
              <p role="alert" className="mt-1.5 text-xs text-accent">
                {codeError ?? errors.discountCode}
              </p>
            )}
          </div>

          {/* Totals ------------------------------------------------------ */}
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-mono">{formatIDR(cart.subtotal)}</dd>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-accent">
                <dt>Discount</dt>
                <dd className="font-mono">−{formatIDR(discountTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd className="font-mono">
                {!chosen
                  ? "—"
                  : freeShipping
                    ? "Free"
                    : formatIDR(shippingTotal)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <dt className="font-medium">Total</dt>
              <dd className="font-mono">{formatIDR(grandTotal)}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <PayButton total={grandTotal} />
          </div>

          <p className="mt-3 text-center text-xs leading-relaxed text-muted">
            You&apos;ll pick QRIS, e-wallet, virtual account or card on the next
            step. Final prices are confirmed by our server before you pay.
          </p>
        </div>
      </aside>
    </form>
  );
}
