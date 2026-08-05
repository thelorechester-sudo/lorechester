"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/admin/ui";
import { notifyBackInStock, type BlastState } from "./actions";

function Submit({ count, hasStock }: { count: number; hasStock: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={hasStock ? "primary" : "secondary"}
      disabled={pending}
      title={
        hasStock
          ? undefined
          : "This product has no stock — restock it first, or the link will land on a sold-out page."
      }
    >
      {pending ? "Sending…" : `Tell ${count}`}
    </Button>
  );
}

export function NotifyButton({
  productId,
  count,
  hasStock,
}: {
  productId: string;
  count: number;
  hasStock: boolean;
}) {
  const [state, formAction] = useActionState<BlastState, FormData>(
    notifyBackInStock,
    { ok: false },
  );

  if (state.message) {
    return <span className="text-xs text-emerald-700">{state.message}</span>;
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const warning = hasStock
          ? `Message ${count} ${count === 1 ? "person" : "people"} that this is back in stock?`
          : `This product has NO stock right now. Everyone you message will land on a sold-out page. Send anyway?`;
        if (!confirm(warning)) event.preventDefault();
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <Submit count={count} hasStock={hasStock} />
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-accent">
          {state.error}
        </p>
      )}
    </form>
  );
}
