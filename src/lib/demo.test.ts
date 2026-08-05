import assert from "node:assert/strict";
import { test } from "node:test";

import { cartItemsSchema } from "./cart-types";
import { demoProducts, findDemoVariant } from "./demo";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("every demo id is a well-formed v4 UUID", () => {
  for (const product of demoProducts) {
    assert.match(product.id, UUID_V4, `product ${product.slug}`);
    for (const image of product.images) assert.match(image.id, UUID_V4);
    for (const variant of product.variants) {
      assert.match(variant.id, UUID_V4, `${product.slug} ${variant.size}`);
    }
  }
});

test("no two demo entities share an id", () => {
  // Regression: hex-encoding the slug and truncating to 32 chars collided for
  // no-city-humbles-us-white and -black, which share their first 16 characters.
  const ids = demoProducts.flatMap((product) => [
    product.id,
    ...product.images.map((i) => i.id),
    ...product.variants.map((v) => v.id),
  ]);

  assert.equal(new Set(ids).size, ids.length, "duplicate id in demo fixtures");
});

test("demo variant ids pass the cart schema", () => {
  // If these fail z.uuid(), getCartLines silently returns an empty bag.
  const items = demoProducts.map((product) => ({
    variantId: product.variants[0].id,
    qty: 1,
  }));

  assert.equal(cartItemsSchema.safeParse(items).success, true);
});

test("every variant is findable by id", () => {
  for (const product of demoProducts) {
    for (const variant of product.variants) {
      const found = findDemoVariant(variant.id);
      assert.ok(found, `${product.slug} ${variant.size} not found`);
      assert.equal(found.product.slug, product.slug);
      assert.equal(found.variant.size, variant.size);
    }
  }
});

test("product image paths point at files under /public", () => {
  for (const product of demoProducts) {
    for (const image of product.images) {
      assert.match(image.url, /^\/(lookbook|products|brand)\//, image.url);
    }
  }
});
