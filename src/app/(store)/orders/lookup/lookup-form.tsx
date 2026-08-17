"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { lookupOrder, type LookupState } from "./actions";

const inputClass =
  "w-full border border-line bg-paper-pure px-3 py-2.5 text-sm outline-none focus:border-ink";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-button bg-ink text-paper transition-colors hover:bg-ink-soft disabled:opacity-50"
    >
      <span className="meta">{pending ? "Looking…" : "Find my order"}</span>
    </button>
  );
}

export function LookupForm() {
  const [state, formAction] = useActionState<LookupState, FormData>(
    lookupOrder,
    {},
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="meta block text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="orderNumber" className="meta block text-muted">
          Order number
        </label>
        <input
          id="orderNumber"
          name="orderNumber"
          required
          placeholder="LRC-7K3M9QDX"
          className={`${inputClass} tabular-nums uppercase`}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      )}

      <Submit />
    </form>
  );
}
