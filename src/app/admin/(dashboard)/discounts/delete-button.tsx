"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/admin/ui";
import { deleteDiscount } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button variant="danger" size="sm" type="submit" disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

export function DeleteDiscountButton({
  id,
  code,
}: {
  id: string;
  code: string;
}) {
  return (
    <form
      action={deleteDiscount}
      onSubmit={(event) => {
        if (!confirm(`Delete the code ${code}? Past orders keep their discount.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}
