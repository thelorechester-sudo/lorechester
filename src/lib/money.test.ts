import assert from "node:assert/strict";
import { test } from "node:test";

import { formatIDR, formatIDRPlain, percentOf } from "./money";

test("formatIDR renders Indonesian thousands separators", () => {
  assert.equal(formatIDR(498000), "Rp 498.000");
  assert.equal(formatIDR(1198000), "Rp 1.198.000");
  assert.equal(formatIDR(0), "Rp 0");
});

test("formatIDR emits no non-breaking space", () => {
  // The UI relies on a plain space so long prices can wrap.
  assert.equal(formatIDR(498000).includes(" "), false);
});

test("formatIDR shows no decimals — IDR has no minor unit", () => {
  assert.equal(formatIDR(1000).includes(","), false);
});

test("formatIDRPlain omits the currency symbol", () => {
  assert.equal(formatIDRPlain(498000), "498.000");
});

test("percentOf returns whole rupiah", () => {
  assert.equal(percentOf(498000, 10), 49800);
  assert.equal(percentOf(100000, 15), 15000);
  // 333 * 0.1 = 33.3 -> must round, never leave a fraction in the total
  assert.equal(percentOf(333, 10), 33);
  assert.equal(Number.isInteger(percentOf(12345, 17)), true);
});
