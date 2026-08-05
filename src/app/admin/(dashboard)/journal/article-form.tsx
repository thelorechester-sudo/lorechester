"use client";

import Link from "next/link";
import { FormErrors } from "@/components/admin/form-errors";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { ImageManager, type ManagedImage } from "@/components/admin/image-manager";
import { Button, Field, Input, Select, Textarea } from "@/components/admin/ui";
import { slugify } from "@/lib/slug";
import { saveArticle, type ActionState } from "./actions";

export type ArticleFormValues = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  body: string;
  status: "draft" | "published";
};

export const EMPTY_ARTICLE: ArticleFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  coverImage: null,
  body: "",
  status: "draft",
};

function Submit({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : isNew ? "Create article" : "Save changes"}
    </Button>
  );
}

export function ArticleForm({ initial }: { initial: ArticleFormValues }) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveArticle, {
    ok: true,
  });
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));

  const errors = state.errors ?? {};
  const cover: ManagedImage[] = values.coverImage
    ? [{ url: values.coverImage, alt: "" }]
    : [];

  const payload = JSON.stringify({ ...values, slug: values.slug.trim() });

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_18rem]">
      <input type="hidden" name="payload" value={payload} />

      <FormErrors
        errors={errors}
        handled={["title","slug","excerpt","body","status"]}
        className="lg:col-span-2"
      />

      <div className="space-y-6">
        <section className="space-y-4 rounded-lg border border-line bg-paper-pure p-5">
          <Field label="Title" htmlFor="title" error={errors.title}>
            <Input
              id="title"
              value={values.title}
              onChange={(event) => {
                const title = event.target.value;
                setValues((prev) => ({
                  ...prev,
                  title,
                  slug: slugTouched ? prev.slug : slugify(title),
                }));
              }}
              placeholder="Behind the Blooming Boundaries shoot"
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="slug"
            error={errors.slug}
            hint={`Store URL: /journal/${values.slug || "…"}`}
          >
            <Input
              id="slug"
              value={values.slug}
              onChange={(event) => {
                setSlugTouched(true);
                setValues((prev) => ({ ...prev, slug: slugify(event.target.value) }));
              }}
            />
          </Field>

          <Field
            label="Excerpt"
            htmlFor="excerpt"
            error={errors.excerpt}
            hint="Shown on the journal index and used as the search-result description."
          >
            <Textarea
              id="excerpt"
              rows={2}
              value={values.excerpt}
              onChange={(e) => setValues({ ...values, excerpt: e.target.value })}
            />
          </Field>
        </section>

        <section className="space-y-3 rounded-lg border border-line bg-paper-pure p-5">
          <h2 className="text-sm font-semibold">Cover image</h2>
          <ImageManager
            folder="journal"
            max={1}
            images={cover}
            onChange={(images) =>
              setValues({ ...values, coverImage: images[0]?.url ?? null })
            }
          />
        </section>

        <section className="space-y-3 rounded-lg border border-line bg-paper-pure p-5">
          <h2 className="text-sm font-semibold">Body</h2>
          <p className="text-xs leading-relaxed text-muted">
            Blank line = new paragraph. Start a line with{" "}
            <code className="font-mono">##</code> for a heading. A line
            containing only an image URL becomes a full-width image.
          </p>
          <Textarea
            aria-label="Article body"
            rows={20}
            value={values.body}
            onChange={(e) => setValues({ ...values, body: e.target.value })}
            className="font-mono text-xs leading-relaxed"
          />
          {errors.body && (
            <p role="alert" className="text-xs text-accent">
              {errors.body}
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <section className="space-y-4 rounded-lg border border-line bg-paper-pure p-5">
          <Field label="Status" htmlFor="status" error={errors.status}>
            <Select
              id="status"
              value={values.status}
              onChange={(e) =>
                setValues({
                  ...values,
                  status: e.target.value as ArticleFormValues["status"],
                })
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Field>
        </section>

        <div className="flex items-center gap-3">
          <Submit isNew={!initial.id} />
          <Link href="/admin/journal" className="text-sm text-muted hover:text-ink">
            Cancel
          </Link>
        </div>
      </aside>
    </form>
  );
}
