import assert from "node:assert/strict";
import { test } from "node:test";

import { computeTotals, discountAmount } from "./pricing";

const PERCENT_10 = { type: "percent", value: 10, minSubtotal: 0 } as const;
const FIXED_50K = { type: "fixed", value: 50_000, minSubtotal: 0 } as const;

test("percentage discount rounds to whole rupiah", () => {
  assert.equal(discountAmount(PERCENT_10, 498_000), 49_800);
  assert.equal(discountAmount(PERCENT_10, 333), 33);
});

test("discount never exceeds the subtotal", () => {
  assert.equal(discountAmount(FIXED_50K, 30_000), 30_000);
  assert.equal(
    discountAmount({ type: "percent", value: 100, minSubtotal: 0 }, 80_000),
    80_000,
  );
});

test("a percentage above 100 is clamped, not trusted", () => {
  assert.equal(
    discountAmount({ type: "percent", value: 500, minSubtotal: 0 }, 100_000),
    100_000,
  );
});

test("minimum subtotal is enforced", () => {
  const rule = { type: "fixed", value: 50_000, minSubtotal: 300_000 } as const;
  assert.equal(discountAmount(rule, 299_999), 0);
  assert.equal(discountAmount(rule, 300_000), 50_000);
});

test("totals add up", () => {
  const totals = computeTotals({
    subtotal: 498_000,
    discount: PERCENT_10,
    shippingPrice: 25_000,
    freeShippingThreshold: 0,
  });

  assert.equal(totals.discountTotal, 49_800);
  assert.equal(totals.shippingTotal, 25_000);
  assert.equal(totals.grandTotal, 498_000 - 49_800 + 25_000);
  assert.equal(totals.freeShippingApplied, false);
});

test("free shipping is measured after the discount, not before", () => {
  // 520k subtotal clears a 500k threshold, but only until a 10% coupon lands.
  const totals = computeTotals({
    subtotal: 520_000,
    discount: PERCENT_10,
    shippingPrice: 25_000,
    freeShippingThreshold: 500_000,
  });

  assert.equal(totals.discountTotal, 52_000);
  assert.equal(totals.freeShippingApplied, false);
  assert.equal(totals.shippingTotal, 25_000);
  assert.equal(totals.grandTotal, 493_000);
});

test("free shipping applies once the post-discount subtotal clears", () => {
  const totals = computeTotals({
    subtotal: 600_000,
    discount: PERCENT_10,
    shippingPrice: 25_000,
    freeShippingThreshold: 500_000,
  });

  assert.equal(totals.freeShippingApplied, true);
  assert.equal(totals.shippingTotal, 0);
  assert.equal(totals.grandTotal, 540_000);
});

test("a zero threshold disables free shipping entirely", () => {
  const totals = computeTotals({
    subtotal: 10_000_000,
    discount: null,
    shippingPrice: 25_000,
    freeShippingThreshold: 0,
  });

  assert.equal(totals.freeShippingApplied, false);
  assert.equal(totals.shippingTotal, 25_000);
});

test("every total is a whole rupiah", () => {
  const totals = computeTotals({
    subtotal: 333_333,
    discount: { type: "percent", value: 17, minSubtotal: 0 },
    shippingPrice: 18_500,
    freeShippingThreshold: 500_000,
  });

  for (const value of [
    totals.subtotal,
    totals.discountTotal,
    totals.shippingTotal,
    totals.grandTotal,
  ]) {
    assert.equal(Number.isInteger(value), true);
  }
});

test("a 100% discount with free shipping leaves nothing to charge", () => {
  // Checkout must refuse this rather than send gross_amount = 0 to Midtrans.
  const totals = computeTotals({
    subtotal: 600_000,
    discount: { type: "percent", value: 100, minSubtotal: 0 },
    shippingPrice: 25_000,
    freeShippingThreshold: 0,
  });

  assert.equal(totals.grandTotal, 25_000);

  const allFree = computeTotals({
    subtotal: 600_000,
    discount: { type: "percent", value: 100, minSubtotal: 0 },
    shippingPrice: 0,
    freeShippingThreshold: 0,
  });
  assert.equal(allFree.grandTotal, 0);
});
