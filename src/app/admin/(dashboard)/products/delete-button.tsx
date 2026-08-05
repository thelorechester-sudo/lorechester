"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/admin/ui";
import { deleteProduct } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button variant="danger" size="sm" type="submit" disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

export function DeleteProductButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  return (
    <form
      action={deleteProduct}
      onSubmit={(event) => {
        // Native confirm is enough for a two-person back office, and it cannot
        // be dismissed by a stray click the way a custom modal can.
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}
