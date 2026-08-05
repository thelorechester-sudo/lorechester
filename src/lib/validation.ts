import { z } from "zod";

/**
 * Input schemas for Server Actions. Every mutation parses its input through one
 * of these before touching the database — Server Actions are public HTTP
 * endpoints, so the form UI is not a validation layer.
 */

export { slugify } from "./slug";

const rupiah = z
  .number()
  .int("Prices must be whole rupiah")
  .min(0, "Price cannot be negative")
  .max(2_000_000_000, "Price is implausibly large");

/**
 * An image reference: either an absolute http(s) URL (Supabase Storage) or a
 * root-relative path into /public (the brand assets shipped with the repo).
 *
 * Plain `z.url()` rejects "/lookbook/goal-01.jpg", which silently made every
 * product using the bundled photography unsaveable.
 *
 * Rejects protocol-relative "//evil.com" and any path containing "..".
 */
export const imageSource = z
  .string()
  .min(1, "Image is required")
  .refine(
    (value) =>
      /^https?:\/\/[^\s/]+\/?/.test(value) ||
      (value.startsWith("/") && !value.startsWith("//") && !value.includes("..")),
    "Must be an https:// URL or a path like /lookbook/photo.jpg",
  );

export const variantInput = z.object({
  id: z.uuid().optional(),
  size: z.string().min(1, "Size is required").max(20),
  color: z.string().max(40).nullish(),
  sku: z.string().max(60).nullish(),
  stock: z.number().int().min(0, "Stock cannot be negative").max(100_000),
  priceOverride: rupiah.nullish(),
  position: z.number().int().min(0).default(0),
});

export const imageInput = z.object({
  id: z.uuid().optional(),
  url: imageSource,
  alt: z.string().max(200).default(""),
  position: z.number().int().min(0).default(0),
});

export const productInput = z
  .object({
    id: z.uuid().optional(),
    title: z.string().min(1, "Title is required").max(160),
    slug: z
      .string()
      .min(1, "Slug is required")
      .max(80)
      .regex(/^[a-z0-9-]+$/, "Slug may only contain a-z, 0-9 and dashes"),
    description: z.string().max(4000).default(""),
    details: z.string().max(4000).default(""),
    status: z.enum(["draft", "active", "archived"]),
    price: rupiah,
    compareAtPrice: rupiah.nullish(),
    category: z.string().max(60).nullish(),
    featured: z.boolean().default(false),
    weightGrams: z
      .number()
      .int()
      .min(1, "Weight is required to quote shipping")
      .max(50_000),
    images: z.array(imageInput).max(12),
    variants: z
      .array(variantInput)
      .min(1, "Add at least one size")
      .max(30)
      .refine(
        (list) =>
          new Set(list.map((v) => `${v.size}|${v.color ?? ""}`)).size ===
          list.length,
        "Two variants share the same size and colour",
      ),
  })
  .refine(
    (p) => p.compareAtPrice == null || p.compareAtPrice > p.price,
    {
      error: "Compare-at price must be higher than the selling price",
      path: ["compareAtPrice"],
    },
  );

export type ProductInput = z.infer<typeof productInput>;

export const collectionInput = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1, "Title is required").max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain a-z, 0-9 and dashes"),
  description: z.string().max(2000).default(""),
  heroImage: imageSource.nullish(),
  releaseAt: z.coerce.date().nullish(),
  productIds: z.array(z.uuid()).default([]),
});

export type CollectionInput = z.infer<typeof collectionInput>;

export const discountInput = z
  .object({
    id: z.uuid().optional(),
    code: z
      .string()
      .min(3, "Code must be at least 3 characters")
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, dash and underscore only"),
    type: z.enum(["percent", "fixed"]),
    value: z.number().int().min(1),
    minSubtotal: rupiah.default(0),
    startsAt: z.coerce.date().nullish(),
    endsAt: z.coerce.date().nullish(),
    usageLimit: z.number().int().min(1).nullish(),
    active: z.boolean().default(true),
  })
  .refine((d) => d.type !== "percent" || d.value <= 100, {
    error: "A percentage discount cannot exceed 100",
    path: ["value"],
  })
  .refine((d) => !d.startsAt || !d.endsAt || d.endsAt > d.startsAt, {
    error: "End date must be after the start date",
    path: ["endsAt"],
  });

export type DiscountInput = z.infer<typeof discountInput>;

export const articleInput = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1, "Title is required").max(200),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain a-z, 0-9 and dashes"),
  excerpt: z.string().max(400).default(""),
  coverImage: imageSource.nullish(),
  body: z.string().max(60_000).default(""),
  status: z.enum(["draft", "published"]),
});

export type ArticleInput = z.infer<typeof articleInput>;

export const showcaseInput = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1, "Title is required").max(160),
  caption: z.string().max(1000).default(""),
  images: z
    .array(z.object({ url: imageSource, alt: z.string().max(200).default("") }))
    .min(1, "Add at least one image")
    .max(20),
  linkedProductIds: z.array(z.uuid()).max(20).default([]),
  published: z.boolean().default(false),
  position: z.number().int().min(0).default(0),
});

export type ShowcaseInput = z.infer<typeof showcaseInput>;

/**
 * Shape a Zod failure into `{ field: "message" }` for `useActionState`.
 * `_form` collects errors that are not tied to a single field.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    out[key] ??= issue.message;
  }
  return out;
}
