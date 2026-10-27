"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { FormErrors } from "@/components/admin/form-errors";
import { Button, Field, Input, Textarea } from "@/components/admin/ui";
import type { PageContent, PageSlug } from "@/lib/pages";
import { resetPage, savePage, type ActionState } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

const TOKENS: [string, string][] = [
  ["{{email}}", "your email"],
  ["{{whatsapp}}", "your WhatsApp number"],
  ["{{business_name}}", "legal business name"],
  ["{{business_address}}", "business address"],
  ["{{business_id}}", "registration number"],
  ["{{free_shipping}}", "free-shipping amount"],
];

export function PageForm({
  slug,
  initial,
  defaults,
}: {
  slug: PageSlug;
  initial: PageContent;
  defaults: PageContent;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(savePage, {
    ok: false,
  });
  const [values, setValues] = useState(initial);
  const [resetting, startReset] = useTransition();
  const [resetNote, setResetNote] = useState<string | null>(null);

  const errors = state.errors ?? {};
  const set = <K extends keyof PageContent>(key: K, value: PageContent[K]) => {
    setResetNote(null);
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  function restore() {
    if (!confirm("Discard your wording and go back to the built-in text?")) return;
    const data = new FormData();
    data.set("slug", slug);
    startReset(async () => {
      const result = await resetPage({ ok: false }, data);
      if (result.ok) {
        setValues(defaults);
        setResetNote(result.message ?? "Restored.");
      }
    });
  }

  return (
    <form action={formAction} className="grid gap-10 lg:grid-cols-[1fr_16rem]">
      <input type="hidden" name="payload" value={JSON.stringify({ ...values, slug })} />

      <div className="space-y-6">
        <FormErrors errors={errors} handled={["title", "description", "body"]} />

        {state.ok && !resetNote && (
          <p
            role="status"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            Saved. The page is updated.
          </p>
        )}
        {resetNote && (
          <p role="status" className="rounded-md border border-line bg-paper px-3 py-2 text-sm">
            {resetNote}
          </p>
        )}

        <Field label="Title" htmlFor="title" error={errors.title}>
          <Input
            id="title"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>

        <Field
          label="Search description"
          htmlFor="description"
          error={errors.description}
          hint="One sentence shown by Google under the page title."
        >
          <Textarea
            id="description"
            rows={2}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <Field label="Text" htmlFor="body" error={errors.body}>
          <Textarea
            id="body"
            rows={26}
            value={values.body}
            className="font-mono text-[13px] leading-relaxed"
            onChange={(e) => set("body", e.target.value)}
          />
        </Field>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper-pure/95 px-4 py-4 backdrop-blur sm:mx-0 sm:px-0">
          <SaveButton />
          <Button type="button" variant="secondary" disabled={resetting} onClick={restore}>
            {resetting ? "Restoring…" : "Restore built-in text"}
          </Button>
        </div>
      </div>

      <aside className="space-y-6 text-xs leading-relaxed text-muted lg:pt-7">
        <div>
          <p className="meta mb-2 text-ink">How to format</p>
          <ul className="space-y-1.5">
            <li>Leave a blank line between paragraphs.</li>
            <li><code>## Heading</code> makes a heading.</li>
            <li><code>- item</code> on each line makes a bullet list.</li>
            <li><code>**bold**</code> makes bold text.</li>
            <li><code>[words](/shop)</code> makes a link.</li>
            <li>A line starting with <code>|</code> makes a table; the first row is the header: <code>| Size | Width |</code></li>
            <li>A line with only an image address shows the image.</li>
          </ul>
        </div>

        <div>
          <p className="meta mb-2 text-ink">Fill-ins</p>
          <p className="mb-2">
            These are replaced with your details from Site settings:
          </p>
          <ul className="space-y-1">
            {TOKENS.map(([token, what]) => (
              <li key={token}>
                <code>{token}</code> — {what}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </form>
  );
}
