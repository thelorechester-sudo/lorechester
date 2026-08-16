import assert from "node:assert/strict";
import { test } from "node:test";

import { PROVINCES, REGENCIES_BY_PROVINCE } from "./indonesia-regions";

test("34 provinces, no duplicate ids or names", () => {
  assert.equal(PROVINCES.length, 34);
  assert.equal(new Set(PROVINCES.map((p) => p.id)).size, 34);
  assert.equal(new Set(PROVINCES.map((p) => p.name)).size, 34);
});

test("every province has at least one regency, and every regency id is unique", () => {
  const allIds = new Set<string>();

  for (const province of PROVINCES) {
    const regencies = REGENCIES_BY_PROVINCE[province.id];
    assert.ok(regencies, `${province.name} has no regency list at all`);
    assert.ok(regencies.length > 0, `${province.name} has zero regencies`);
    for (const r of regencies) allIds.add(r.id);
  }

  const total = PROVINCES.reduce(
    (sum, p) => sum + REGENCIES_BY_PROVINCE[p.id].length,
    0,
  );
  assert.equal(allIds.size, total, "a regency id is reused across provinces");
});

test("Jakarta is present with its five cities plus Kepulauan Seribu", () => {
  const jakarta = PROVINCES.find((p) => p.name === "DKI Jakarta");
  assert.ok(jakarta);
  assert.equal(REGENCIES_BY_PROVINCE[jakarta.id].length, 6);
});
