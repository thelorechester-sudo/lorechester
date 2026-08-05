import assert from "node:assert/strict";
import { test } from "node:test";

import { demoProducts } from "./demo";
import { fieldErrors, imageSource, productInput } from "./validation";

test("imageSource accepts the bundled /public paths", () => {
  // Regression: z.url() rejected these, which silently made every product
  // using the local brand assets impossible to save from the admin.
  for (const value of [
    "/lookbook/goal-01.jpg",
    "/products/compass-white.jpg",
    "/brand/wordmark-white.png",
  ]) {
    assert.equal(imageSource.safeParse(value).success, true, value);
  }
});

test("imageSource accepts absolute https URLs", () => {
  assert.equal(
    imageSource.safeParse(
      "https://abc.supabase.co/storage/v1/object/public/media/a.jpg",
    ).success,
    true,
  );
});

test("imageSource rejects traversal and protocol-relative hosts", () => {
  for (const value of ["//evil.com/x.jpg", "/../../etc/passwd", "", "javascript:alert(1)"]) {
    assert.equal(imageSource.safeParse(value).success, false, value);
  }
});

test("every seeded product passes the admin save schema", () => {
  // If this fails, that product cannot be edited and saved in /admin.
  for (const product of demoProducts) {
    const payload = {
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      details: product.details,
      status: product.status,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      category: product.category,
      featured: product.featured,
      weightGrams: product.weightGrams,
      images: product.images.map((image, position) => ({
        url: image.url,
        alt: image.alt,
        position,
      })),
      variants: product.variants.map((variant, position) => ({
        id: variant.id,
        size: variant.size,
        color: variant.color,
        sku: variant.sku,
        stock: variant.stock,
        priceOverride: variant.priceOverride,
        position,
      })),
    };

    const result = productInput.safeParse(payload);
    assert.equal(
      result.success,
      true,
      `${product.slug}: ${result.success ? "" : JSON.stringify(fieldErrors(result.error))}`,
    );
  }
});

test("fieldErrors keys nested issues by path", () => {
  const bad = productInput.safeParse({
    title: "x",
    slug: "x",
    status: "active",
    price: 1000,
    weightGrams: 300,
    images: [{ url: "not a url", alt: "", position: 0 }],
    variants: [{ size: "M", stock: 1, position: 0 }],
  });

  assert.equal(bad.success, false);
  if (bad.success) return;

  const errors = fieldErrors(bad.error);
  // The admin form must surface this key even though no field renders it —
  // see components/admin/form-errors.tsx.
  assert.ok("images.0.url" in errors, JSON.stringify(errors));
});
