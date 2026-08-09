import assert from "node:assert/strict";
import { test } from "node:test";

import { PRICE_BANDS, isPriceBand } from "./catalog";

/*
 * The query matches a band as half-open [min, max). That is only correct if
 * the bands themselves tile the range with no gap and no overlap — otherwise a
 * product priced on an edge either matches two bands or disappears from all of
 * them. These assert the shape the query relies on; they do not exercise the
 * SQL, which needs a database.
 */

test("bands are contiguous, ascending and open-ended at the top", () => {
  assert.equal(PRICE_BANDS[0].min, 0, "the first band starts at zero");

  for (const [index, band] of PRICE_BANDS.entries()) {
    const next = PRICE_BANDS[index + 1];

    if (!next) {
      assert.equal(band.max, null, "the last band has no upper bound");
      break;
    }

    assert.notEqual(band.max, null, `band ${band.id} needs an upper bound`);
    assert.equal(
      next.min,
      band.max,
      `${next.id} must start exactly where ${band.id} ends`,
    );
  }
});

test("every price falls in exactly one band", () => {
  const edges = PRICE_BANDS.flatMap((band) => [band.min, band.max ?? 10_000_000]);
  const probes = [0, 1, ...edges, ...edges.map((e) => e - 1), 99_000_000];

  for (const price of probes.filter((p) => p >= 0)) {
    const matches = PRICE_BANDS.filter(
      (band) => price >= band.min && (band.max === null || price < band.max),
    );
    assert.equal(matches.length, 1, `${price} matched ${matches.length} bands`);
  }
});

test("isPriceBand rejects anything not on the list", () => {
  // The value arrives from the query string, so it is attacker-controlled.
  assert.ok(isPriceBand("under-250"));
  assert.ok(!isPriceBand("250-380; drop table products"));
  assert.ok(!isPriceBand(undefined));
  assert.ok(!isPriceBand(""));
});
