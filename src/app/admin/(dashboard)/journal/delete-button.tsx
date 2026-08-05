"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/admin/ui";
import { deleteArticle } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button variant="danger" size="sm" type="submit" disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

export function DeleteArticleButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteArticle}
      onSubmit={(event) => {
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
