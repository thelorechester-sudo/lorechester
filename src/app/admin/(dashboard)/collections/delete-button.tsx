"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/admin/ui";
import { deleteCollection } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button variant="danger" size="sm" type="submit" disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

export function DeleteCollectionButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  return (
    <form
      action={deleteCollection}
      onSubmit={(event) => {
        if (
          !confirm(
            `Delete the "${title}" collection? The products in it are kept.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}
