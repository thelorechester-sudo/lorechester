"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { joinWaitlist, type WaitlistState } from "@/app/actions/waitlist";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 border border-ink px-5 py-2.5 transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
    >
      <span className="meta">{pending ? "…" : label}</span>
    </button>
  );
}

/**
 * Waitlist signup. Used two ways: attached to a sold-out variant ("tell me when
 * the M is back") and standalone for drop announcements.
 */
export function NotifyMe({
  productId,
  variantId,
  label = "Notify me",
  placeholder = "your@email.com",
  compact = false,
}: {
  productId?: string;
  variantId?: string;
  label?: string;
  placeholder?: string;
  compact?: boolean;
}) {
  const [state, formAction] = useActionState<WaitlistState, FormData>(
    joinWaitlist,
    { ok: false },
  );

  if (state.ok) {
    return (
      <p
        role="status"
        className={compact ? "text-xs text-ink" : "text-sm text-ink"}
      >
        ✓ {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      {productId && <input type="hidden" name="productId" value={productId} />}
      {variantId && <input type="hidden" name="variantId" value={variantId} />}

      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder={placeholder}
          aria-label="Email address"
          className="w-full rounded-input border border-line bg-paper-pure px-3 py-2.5 text-sm outline-none focus:border-ink"
        />
        <Submit label={label} />
      </div>

      <input
        type="tel"
        name="phone"
        placeholder="WhatsApp number (optional)"
        aria-label="WhatsApp number, optional"
        className="w-full rounded-input border border-line bg-paper-pure px-3 py-2.5 text-sm outline-none focus:border-ink"
      />

      {state.error && (
        <p role="alert" className="text-xs text-accent">
          {state.error}
        </p>
      )}
    </form>
  );
}
