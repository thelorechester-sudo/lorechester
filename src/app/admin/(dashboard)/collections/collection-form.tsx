"use client";

import Link from "next/link";
import { FormErrors } from "@/components/admin/form-errors";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { ImageManager, type ManagedImage } from "@/components/admin/image-manager";
import { Button, Field, Input, Textarea } from "@/components/admin/ui";
import { slugify } from "@/lib/slug";
import { saveCollection, type ActionState } from "./actions";

export type CollectionFormValues = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  heroImage: string | null;
  /** `datetime-local` string, or "" for no scheduled drop. */
  releaseAt: string;
  productIds: string[];
};

export const EMPTY_COLLECTION: CollectionFormValues = {
  title: "",
  slug: "",
  description: "",
  heroImage: null,
  releaseAt: "",
  productIds: [],
};

function SubmitButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : isNew ? "Create collection" : "Save changes"}
    </Button>
  );
}

export function CollectionForm({
  initial,
  allProducts,
}: {
  initial: CollectionFormValues;
  allProducts: { id: string; title: string; status: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveCollection,
    { ok: true },
  );
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));

  const errors = state.errors ?? {};

  const hero: ManagedImage[] = values.heroImage
    ? [{ url: values.heroImage, alt: "" }]
    : [];

  const payload = JSON.stringify({
    id: values.id,
    title: values.title.trim(),
    slug: values.slug.trim(),
    description: values.description,
    heroImage: values.heroImage,
    // datetime-local has no timezone; the browser's zone is the intended one.
    releaseAt: values.releaseAt ? new Date(values.releaseAt).toISOString() : null,
    productIds: values.productIds,
  });

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <input type="hidden" name="payload" value={payload} />

      <FormErrors
        errors={errors}
        handled={["title","slug","description","heroImage","releaseAt"]}
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
              placeholder="Blooming Boundaries *2024"
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="slug"
            error={errors.slug}
            hint={`Store URL: /shop/${values.slug || "…"}`}
          >
            <Input
              id="slug"
              value={values.slug}
              onChange={(event) => {
                setSlugTouched(true);
                setValues((prev) => ({
                  ...prev,
                  slug: slugify(event.target.value),
                }));
              }}
            />
          </Field>

          <Field label="Description" htmlFor="description" error={errors.description}>
            <Textarea
              id="description"
              rows={3}
              value={values.description}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </Field>
        </section>

        <section className="space-y-3 rounded-lg border border-line bg-paper-pure p-5">
          <h2 className="text-sm font-semibold">Hero image</h2>
          <ImageManager
            folder="collections"
            max={1}
            images={hero}
            onChange={(images) =>
              setValues((prev) => ({
                ...prev,
                heroImage: images[0]?.url ?? null,
              }))
            }
          />
        </section>

        <section className="space-y-3 rounded-lg border border-line bg-paper-pure p-5">
          <h2 className="text-sm font-semibold">
            Products{" "}
            <span className="font-normal text-muted">
              ({values.productIds.length} selected)
            </span>
          </h2>

          {allProducts.length === 0 ? (
            <p className="text-sm text-muted">
              No products yet. Create one first.
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {allProducts.map((product) => (
                <li key={product.id}>
                  <label className="flex items-center gap-2.5 rounded px-2 py-1.5 text-sm hover:bg-paper">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-ink)]"
                      checked={values.productIds.includes(product.id)}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          productIds: event.target.checked
                            ? [...prev.productIds, product.id]
                            : prev.productIds.filter((id) => id !== product.id),
                        }))
                      }
                    />
                    <span className="truncate">{product.title}</span>
                    {product.status !== "active" && (
                      <span className="meta ml-auto text-muted">
                        {product.status}
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <section className="space-y-4 rounded-lg border border-line bg-paper-pure p-5">
          <Field
            label="Drop date"
            htmlFor="releaseAt"
            error={errors.releaseAt}
            hint="Optional. A future date shows a countdown on the homepage."
          >
            <Input
              id="releaseAt"
              type="datetime-local"
              value={values.releaseAt}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, releaseAt: event.target.value }))
              }
            />
          </Field>
        </section>

        <div className="flex items-center gap-3">
          <SubmitButton isNew={!initial.id} />
          <Link
            href="/admin/collections"
            className="text-sm text-muted hover:text-ink"
          >
            Cancel
          </Link>
        </div>
      </aside>
    </form>
  );
}
