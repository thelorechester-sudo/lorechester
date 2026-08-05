"use client";

import Link from "next/link";
import { FormErrors } from "@/components/admin/form-errors";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { ImageManager, type ManagedImage } from "@/components/admin/image-manager";
import { Button, Field, Input, Textarea } from "@/components/admin/ui";
import { saveShowcase, type ActionState } from "./actions";

export type ShowcaseFormValues = {
  id?: string;
  title: string;
  caption: string;
  images: ManagedImage[];
  linkedProductIds: string[];
  published: boolean;
  position: number;
};

export const EMPTY_SHOWCASE: ShowcaseFormValues = {
  title: "",
  caption: "",
  images: [],
  linkedProductIds: [],
  published: false,
  position: 0,
};

function Submit({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : isNew ? "Create showcase" : "Save changes"}
    </Button>
  );
}

export function ShowcaseForm({
  initial,
  allProducts,
}: {
  initial: ShowcaseFormValues;
  allProducts: { id: string; title: string; status: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveShowcase,
    { ok: true },
  );
  const [values, setValues] = useState(initial);
  const errors = state.errors ?? {};

  const payload = JSON.stringify({
    ...values,
    images: values.images.map((image) => ({ url: image.url, alt: image.alt })),
  });

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_18rem]">
      <input type="hidden" name="payload" value={payload} />

      <FormErrors
        errors={errors}
        handled={["title","caption","images","position"]}
        className="lg:col-span-2"
      />

      <div className="space-y-6">
        <section className="space-y-4 rounded-lg border border-line bg-paper-pure p-5">
          <Field label="Title" htmlFor="title" error={errors.title}>
            <Input
              id="title"
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
              placeholder="Blooming Boundaries — Jakarta"
            />
          </Field>

          <Field
            label="Caption"
            htmlFor="caption"
            error={errors.caption}
            hint="A line or two of context. Shown under the images."
          >
            <Textarea
              id="caption"
              rows={3}
              value={values.caption}
              onChange={(e) => setValues({ ...values, caption: e.target.value })}
            />
          </Field>
        </section>

        <section className="space-y-3 rounded-lg border border-line bg-paper-pure p-5">
          <h2 className="text-sm font-semibold">Images</h2>
          {errors.images && (
            <p role="alert" className="text-xs text-accent">
              {errors.images}
            </p>
          )}
          <ImageManager
            folder="showcase"
            max={20}
            images={values.images}
            onChange={(images) => setValues({ ...values, images })}
          />
        </section>

        <section className="space-y-3 rounded-lg border border-line bg-paper-pure p-5">
          <h2 className="text-sm font-semibold">
            Shop the look{" "}
            <span className="font-normal text-muted">
              ({values.linkedProductIds.length} tagged)
            </span>
          </h2>
          <p className="text-xs text-muted">
            Products worn in this shoot. They appear as a buy strip underneath.
          </p>

          {allProducts.length === 0 ? (
            <p className="text-sm text-muted">No products yet.</p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {allProducts.map((product) => (
                <li key={product.id}>
                  <label className="flex items-center gap-2.5 rounded px-2 py-1.5 text-sm hover:bg-paper">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-ink)]"
                      checked={values.linkedProductIds.includes(product.id)}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          linkedProductIds: event.target.checked
                            ? [...prev.linkedProductIds, product.id]
                            : prev.linkedProductIds.filter(
                                (id) => id !== product.id,
                              ),
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.published}
              onChange={(e) =>
                setValues({ ...values, published: e.target.checked })
              }
              className="size-4 accent-[var(--color-ink)]"
            />
            Published
          </label>

          <Field
            label="Order"
            htmlFor="position"
            error={errors.position}
            hint="Lower numbers appear first."
          >
            <Input
              id="position"
              type="number"
              min={0}
              value={values.position}
              onChange={(e) =>
                setValues({ ...values, position: Number(e.target.value) || 0 })
              }
            />
          </Field>
        </section>

        <div className="flex items-center gap-3">
          <Submit isNew={!initial.id} />
          <Link href="/admin/showcase" className="text-sm text-muted hover:text-ink">
            Cancel
          </Link>
        </div>
      </aside>
    </form>
  );
}
