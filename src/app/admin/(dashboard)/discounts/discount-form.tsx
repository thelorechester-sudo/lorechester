"use client";

import Link from "next/link";
import { FormErrors } from "@/components/admin/form-errors";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button, Field, Input, Select } from "@/components/admin/ui";
import { formatIDR } from "@/lib/money";
import { saveDiscount, type ActionState } from "./actions";

export type DiscountFormValues = {
  id?: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minSubtotal: number;
  /** `datetime-local` strings, or "". */
  startsAt: string;
  endsAt: string;
  usageLimit: number | null;
  active: boolean;
};

export const EMPTY_DISCOUNT: DiscountFormValues = {
  code: "",
  type: "percent",
  value: 10,
  minSubtotal: 0,
  startsAt: "",
  endsAt: "",
  usageLimit: null,
  active: true,
};

function Submit({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : isNew ? "Create code" : "Save changes"}
    </Button>
  );
}

export function DiscountForm({ initial }: { initial: DiscountFormValues }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveDiscount,
    { ok: true },
  );
  const [values, setValues] = useState(initial);
  const errors = state.errors ?? {};

  const payload = JSON.stringify({
    ...values,
    code: values.code.trim().toUpperCase(),
    startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : null,
    endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
    usageLimit: values.usageLimit,
  });

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <input type="hidden" name="payload" value={payload} />

      <FormErrors
        errors={errors}
        handled={["code","type","value","minSubtotal","startsAt","endsAt","usageLimit"]}
      />

      <Field
        label="Code"
        htmlFor="code"
        error={errors.code}
        hint="What the customer types at checkout. Case-insensitive."
      >
        <Input
          id="code"
          value={values.code}
          onChange={(e) =>
            setValues({ ...values, code: e.target.value.toUpperCase() })
          }
          placeholder="WELCOME10"
          className="font-mono uppercase"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="type" error={errors.type}>
          <Select
            id="type"
            value={values.type}
            onChange={(e) =>
              setValues({
                ...values,
                type: e.target.value as DiscountFormValues["type"],
              })
            }
          >
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
          </Select>
        </Field>

        <Field
          label={values.type === "percent" ? "Percent off" : "Amount off (Rp)"}
          htmlFor="value"
          error={errors.value}
          hint={
            values.type === "fixed" && values.value > 0
              ? formatIDR(values.value)
              : undefined
          }
        >
          <Input
            id="value"
            type="number"
            min={1}
            max={values.type === "percent" ? 100 : undefined}
            step={1}
            value={values.value || ""}
            onChange={(e) =>
              setValues({ ...values, value: Number(e.target.value) || 0 })
            }
          />
        </Field>
      </div>

      <Field
        label="Minimum subtotal (Rp)"
        htmlFor="minSubtotal"
        error={errors.minSubtotal}
        hint={
          values.minSubtotal > 0
            ? `Only valid on bags over ${formatIDR(values.minSubtotal)}`
            : "0 = no minimum"
        }
      >
        <Input
          id="minSubtotal"
          type="number"
          min={0}
          step={1}
          value={values.minSubtotal || ""}
          onChange={(e) =>
            setValues({ ...values, minSubtotal: Number(e.target.value) || 0 })
          }
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" htmlFor="startsAt" error={errors.startsAt}>
          <Input
            id="startsAt"
            type="datetime-local"
            value={values.startsAt}
            onChange={(e) => setValues({ ...values, startsAt: e.target.value })}
          />
        </Field>
        <Field label="Ends" htmlFor="endsAt" error={errors.endsAt}>
          <Input
            id="endsAt"
            type="datetime-local"
            value={values.endsAt}
            onChange={(e) => setValues({ ...values, endsAt: e.target.value })}
          />
        </Field>
      </div>

      <Field
        label="Usage limit"
        htmlFor="usageLimit"
        error={errors.usageLimit}
        hint="Total redemptions across all customers. Leave blank for unlimited."
      >
        <Input
          id="usageLimit"
          type="number"
          min={1}
          value={values.usageLimit ?? ""}
          onChange={(e) =>
            setValues({
              ...values,
              usageLimit: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.active}
          onChange={(e) => setValues({ ...values, active: e.target.checked })}
          className="size-4 accent-[var(--color-ink)]"
        />
        Active
      </label>

      <div className="flex items-center gap-3 pt-2">
        <Submit isNew={!initial.id} />
        <Link href="/admin/discounts" className="text-sm text-muted hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
