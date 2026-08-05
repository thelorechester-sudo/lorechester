import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeIndonesianPhone } from "./phone";

test("every way a customer writes their number lands on one form", () => {
  const expected = "628123456789";
  for (const input of [
    "08123456789",
    "8123456789",
    "628123456789",
    "+628123456789",
    "+62 812-3456-789",
    "0812 3456 789",
    "(0812) 3456-789",
  ]) {
    assert.equal(normalizeIndonesianPhone(input), expected, `input: ${input}`);
  }
});

test("non-mobile and malformed numbers are rejected", () => {
  for (const input of [
    "0211234567", // Jakarta landline — cannot receive WhatsApp
    "081", // too short
    "08123456789012345", // too long
    "",
    "not a phone",
    "+1 415 555 0100", // not Indonesian
  ]) {
    assert.equal(normalizeIndonesianPhone(input), null, `input: ${input}`);
  }
});

test("normalising twice is a no-op", () => {
  const once = normalizeIndonesianPhone("08123456789")!;
  assert.equal(normalizeIndonesianPhone(once), once);
});
