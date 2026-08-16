"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormErrors } from "@/components/admin/form-errors";
import { ImageManager, type ManagedImage } from "@/components/admin/image-manager";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  cx,
} from "@/components/admin/ui";
import { formatIDR } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { saveProduct, type ActionState } from "./actions";

export type VariantRow = {
  id?: string;
  size: string;
  color: string;
  sku: string;
  stock: number;
  priceOverride: number | null;
};

export type ProductFormValues = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  details: string;
  status: "draft" | "active" | "archived";
  price: number;
  compareAtPrice: number | null;
  category: string;
  featured: boolean;
  weightGrams: number;
  images: ManagedImage[];
  variants: VariantRow[];
};

export const EMPTY_PRODUCT: ProductFormValues = {
  title: "",
  slug: "",
  description: "",
  details: "100% cotton. Machine wash cold, inside out. Hang dry.",
  status: "draft",
  price: 0,
  compareAtPrice: null,
  category: "",
  featured: false,
  weightGrams: 300,
  images: [],
  variants: [
    { size: "S", color: "", sku: "", stock: 0, priceOverride: null },
    { size: "M", color: "", sku: "", stock: 0, priceOverride: null },
    { size: "L", color: "", sku: "", stock: 0, priceOverride: null },
    { size: "XL", color: "", sku: "", stock: 0, priceOverride: null },
  ],
};

const SIZE_PRESETS: Record<string, string[]> = {
  "Apparel S–XL": ["S", "M", "L", "XL"],
  "Apparel S–XXL": ["S", "M", "L", "XL", "XXL"],
  "One size": ["One Size"],
};

function SubmitButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : isNew ? "Create product" : "Save changes"}
    </Button>
  );
}

export function ProductForm({ initial }: { initial: ProductFormValues }) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveProduct, {
    ok: true,
  });
  const [values, setValues] = useState(initial);

  /*
   * Stock for each variant as this form was first rendered, captured once and
   * never updated. saveProduct applies the difference between this and the
   * submitted value, so a payment webhook that decremented the same variant
   * while the form sat open is not silently overwritten.
   */
  const [stockAtLoad] = useState(
    () =>
      new Map(
        initial.variants
          .filter((variant) => variant.id)
          .map((variant) => [variant.id!, variant.stock]),
      ),
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));

  const errors = state.errors ?? {};
  const isNew = !initial.id;

  function set<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function setVariant(index: number, patch: Partial<VariantRow>) {
    setValues((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  }

  const payload = JSON.stringify({
    id: values.id,
    title: values.title.trim(),
    slug: values.slug.trim(),
    description: values.description,
    details: values.details,
    status: values.status,
    price: values.price,
    compareAtPrice: values.compareAtPrice,
    category: values.category.trim() || null,
    featured: values.featured,
    weightGrams: values.weightGrams,
    images: values.images.map((image, position) => ({
      url: image.url,
      alt: image.alt,
      position,
    })),
    variants: values.variants.map((variant, position) => ({
      id: variant.id,
      size: variant.size,
      color: variant.color || null,
      sku: variant.sku || null,
      stock: variant.stock,
      stockAt: variant.id ? stockAtLoad.get(variant.id) : undefined,
      priceOverride: variant.priceOverride,
      position,
    })),
  });

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <input type="hidden" name="payload" value={payload} />

      <FormErrors
        errors={errors}
        handled={[
          "title",
          "slug",
          "description",
          "details",
          "status",
          "price",
          "compareAtPrice",
          "category",
          "weightGrams",
          "images",
          "variants",
        ]}
        className="lg:col-span-2"
      />

      {/* ---------------------------------------------------------------- */}
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
              placeholder="Bound Bloom T-Shirt — Black"
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="slug"
            error={errors.slug}
            hint={`Store URL: /product/${values.slug || "…"}`}
          >
            <Input
              id="slug"
              value={values.slug}
              onChange={(event) => {
                setSlugTouched(true);
                set("slug", slugify(event.target.value));
              }}
            />
          </Field>

          <Field label="Description" htmlFor="description" error={errors.description}>
            <Textarea
              id="description"
              rows={4}
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="What it is, how it fits, what it's made of."
            />
          </Field>

          <Field
            label="Details"
            htmlFor="details"
            error={errors.details}
            hint="Shown in the collapsible panel on the product page."
          >
            <Textarea
              id="details"
              rows={3}
              value={values.details}
              onChange={(event) => set("details", event.target.value)}
            />
          </Field>
        </section>

        {/* Images ------------------------------------------------------- */}
        <section className="space-y-3 rounded-lg border border-line bg-paper-pure p-5">
          <h2 className="text-sm font-semibold">Images</h2>
          {errors.images && (
            <p role="alert" className="text-xs text-accent">
              {errors.images}
            </p>
          )}
          <ImageManager
            folder="products"
            images={values.images}
            onChange={(images) => set("images", images)}
          />
        </section>

        {/* Variants ----------------------------------------------------- */}
        <section className="space-y-3 rounded-lg border border-line bg-paper-pure p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Sizes &amp; stock</h2>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(SIZE_PRESETS).map(([label, sizes]) => (
                <Button
                  key={label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set(
                      "variants",
                      sizes.map((size) => {
                        const existing = values.variants.find(
                          (v) => v.size === size,
                        );
                        return (
                          existing ?? {
                            size,
                            color: "",
                            sku: "",
                            stock: 0,
                            priceOverride: null,
                          }
                        );
                      }),
                    )
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {(errors.variants || errors._form) && errors.variants && (
            <p role="alert" className="text-xs text-accent">
              {errors.variants}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left">
                  <th className="meta pb-2 text-muted">Size</th>
                  <th className="meta pb-2 text-muted">Colour</th>
                  <th className="meta pb-2 text-muted">SKU</th>
                  <th className="meta pb-2 text-muted">Stock</th>
                  <th className="meta pb-2 text-muted">Price override</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {values.variants.map((variant, index) => (
                  <tr key={variant.id ?? `row-${index}`}>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`Size for row ${index + 1}`}
                        value={variant.size}
                        onChange={(e) => setVariant(index, { size: e.target.value })}
                        className="w-24"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`Colour for row ${index + 1}`}
                        value={variant.color}
                        onChange={(e) => setVariant(index, { color: e.target.value })}
                        className="w-28"
                        placeholder="—"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`SKU for row ${index + 1}`}
                        value={variant.sku}
                        onChange={(e) => setVariant(index, { sku: e.target.value })}
                        className="w-32"
                        placeholder="—"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`Stock for row ${index + 1}`}
                        type="number"
                        min={0}
                        value={variant.stock}
                        onChange={(e) =>
                          setVariant(index, {
                            stock: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className={cx("w-20", variant.stock === 0 && "text-accent")}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`Price override for row ${index + 1}`}
                        type="number"
                        min={0}
                        step={1}
                        value={variant.priceOverride ?? ""}
                        placeholder="—"
                        onChange={(e) =>
                          setVariant(index, {
                            priceOverride: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        className="w-32"
                      />
                    </td>
                    <td className="py-1">
                      <button
                        type="button"
                        aria-label={`Remove size row ${index + 1}`}
                        disabled={values.variants.length === 1}
                        onClick={() =>
                          set(
                            "variants",
                            values.variants.filter((_, i) => i !== index),
                          )
                        }
                        className="rounded px-2 py-1 text-xs text-accent hover:bg-accent-soft disabled:opacity-30"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              set("variants", [
                ...values.variants,
                { size: "", color: "", sku: "", stock: 0, priceOverride: null },
              ])
            }
          >
            Add size
          </Button>
        </section>
      </div>

      {/* Sidebar --------------------------------------------------------- */}
      <aside className="space-y-6">
        <section className="space-y-4 rounded-lg border border-line bg-paper-pure p-5">
          <Field label="Status" htmlFor="status" error={errors.status}>
            <Select
              id="status"
              value={values.status}
              onChange={(e) =>
                set("status", e.target.value as ProductFormValues["status"])
              }
            >
              <option value="draft">Draft — hidden from the store</option>
              <option value="active">Active — on sale</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="size-4 accent-[var(--color-ink)]"
            />
            Feature on the homepage
          </label>
        </section>

        <section className="space-y-4 rounded-lg border border-line bg-paper-pure p-5">
          <Field
            label="Price (Rp)"
            htmlFor="price"
            error={errors.price}
            hint={values.price > 0 ? formatIDR(values.price) : "Whole rupiah only"}
          >
            <Input
              id="price"
              type="number"
              min={0}
              step={1}
              value={values.price || ""}
              onChange={(e) => set("price", Number(e.target.value) || 0)}
            />
          </Field>

          <Field
            label="Compare-at price (Rp)"
            htmlFor="compareAtPrice"
            error={errors.compareAtPrice}
            hint="Optional. Shown struck through to mark a sale."
          >
            <Input
              id="compareAtPrice"
              type="number"
              min={0}
              step={1}
              value={values.compareAtPrice ?? ""}
              onChange={(e) =>
                set(
                  "compareAtPrice",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            />
          </Field>
        </section>

        <section className="space-y-4 rounded-lg border border-line bg-paper-pure p-5">
          <Field label="Category" htmlFor="category" error={errors.category}>
            <Input
              id="category"
              value={values.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="T-Shirts"
              list="category-suggestions"
            />
          </Field>
          <datalist id="category-suggestions">
            <option value="T-Shirts" />
            <option value="Outerwear" />
            <option value="Bottoms" />
            <option value="Accessories" />
          </datalist>

          <Field
            label="Weight (grams)"
            htmlFor="weightGrams"
            error={errors.weightGrams}
            hint="Used to quote courier rates. Include the packaging."
          >
            <Input
              id="weightGrams"
              type="number"
              min={1}
              step={1}
              value={values.weightGrams}
              onChange={(e) => set("weightGrams", Number(e.target.value) || 0)}
            />
          </Field>
        </section>

        <div className="flex items-center gap-3">
          <SubmitButton isNew={isNew} />
          <Link href="/admin/products" className="text-sm text-muted hover:text-ink">
            Cancel
          </Link>
        </div>
      </aside>
    </form>
  );
}
