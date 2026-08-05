"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/admin/ui";
import { deleteShowcase } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button variant="danger" size="sm" type="submit" disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

export function DeleteShowcaseButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  return (
    <form
      action={deleteShowcase}
      onSubmit={(event) => {
        if (!confirm(`Delete the "${title}" showcase? Products are kept.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}
