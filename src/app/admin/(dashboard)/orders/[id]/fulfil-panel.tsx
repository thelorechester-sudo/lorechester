"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button, Field, Input, Select } from "@/components/admin/ui";
import type { OrderStatus } from "@/lib/db/schema";
import { updateOrder, type OrderActionState } from "../actions";

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending payment" },
  { value: "paid", label: "Paid — ready to pack" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : "Update order"}
    </Button>
  );
}

export function FulfilPanel({
  orderId,
  status,
  trackingNumber,
  courier,
}: {
  orderId: string;
  status: OrderStatus;
  trackingNumber: string;
  courier: string;
}) {
  const [state, formAction] = useActionState<OrderActionState, FormData>(
    updateOrder,
    { ok: true },
  );
  const [next, setNext] = useState<OrderStatus>(status);

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <Field label="Set status" htmlFor="status" error={errors.status}>
        <Select
          id="status"
          name="status"
          value={next}
          onChange={(event) => setNext(event.target.value as OrderStatus)}
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Tracking number"
        htmlFor="trackingNumber"
        error={errors.trackingNumber}
        hint={courier ? `Courier: ${courier}` : undefined}
      >
        <Input
          id="trackingNumber"
          name="trackingNumber"
          defaultValue={trackingNumber}
          placeholder="JP1234567890"
          className="font-mono"
        />
      </Field>

      {next === "shipped" && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="notify"
            defaultChecked
            className="mt-0.5 size-4 accent-[var(--color-ink)]"
          />
          <span>
            Send the customer their tracking number on WhatsApp and email.
          </span>
        </label>
      )}

      {errors._form && (
        <p role="alert" className="text-xs text-accent">
          {errors._form}
        </p>
      )}
      {state.ok && state.message && (
        <p className="text-xs text-emerald-700">{state.message}</p>
      )}

      <Save />
    </form>
  );
}
