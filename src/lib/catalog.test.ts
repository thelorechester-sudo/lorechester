import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PRICE_BANDS,
  buildListing,
  isPriceBand,
  type SearchableCard,
} from "./catalog";

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

/*
 * Facet counts are the promise the rail makes: the number beside a value is
 * what the shopper gets by clicking it, so a zero must mean a dead end and a
 * non-zero must never lead to one. These check that against the count rule —
 * every other group's filter applied, the value's own group lifted.
 */

function card(
  over: Partial<SearchableCard> & Pick<SearchableCard, "id">,
): SearchableCard {
  const sizes = over.sizes ?? [{ size: "M", stock: 1 }];
  return {
    slug: over.id,
    title: over.id,
    price: 300_000,
    compareAtPrice: null,
    category: "T-Shirts",
    image: null,
    hoverImage: null,
    search: over.id,
    ...over,
    sizes,
    totalStock: sizes.reduce((sum, s) => sum + s.stock, 0),
  };
}

const CATALOG: SearchableCard[] = [
  card({
    id: "tee-cheap",
    price: 200_000,
    sizes: [{ size: "S", stock: 4 }, { size: "M", stock: 0 }],
  }),
  card({
    id: "tee-mid",
    price: 300_000,
    sizes: [{ size: "M", stock: 2 }, { size: "L", stock: 3 }],
  }),
  card({
    id: "scarf",
    category: "Accessories",
    price: 600_000,
    sizes: [{ size: "One Size", stock: 0 }],
  }),
];

const countOf = (facets: { value: string; count: number }[], value: string) =>
  facets.find((f) => f.value === value)?.count;

test("a facet count is what clicking it actually returns", () => {
  // Every value in every group, against every single-filter starting point.
  const starts = [
    {},
    { categories: ["T-Shirts"] },
    { sizes: ["M"] },
    { inStockOnly: true },
    { price: "under-250" as const },
  ];

  for (const start of starts) {
    const listing = buildListing(CATALOG, start);

    for (const facet of listing.categories) {
      const clicked = buildListing(CATALOG, {
        ...start,
        categories: [facet.value],
      });
      assert.equal(
        facet.count,
        clicked.items.length,
        `category ${facet.value} from ${JSON.stringify(start)}`,
      );
    }

    for (const facet of listing.sizes) {
      const clicked = buildListing(CATALOG, { ...start, sizes: [facet.value] });
      assert.equal(
        facet.count,
        clicked.items.length,
        `size ${facet.value} from ${JSON.stringify(start)}`,
      );
    }

    for (const band of listing.prices) {
      const clicked = buildListing(CATALOG, { ...start, price: band.id });
      assert.equal(
        band.count,
        clicked.items.length,
        `price ${band.id} from ${JSON.stringify(start)}`,
      );
    }
  }
});

test("in-stock counts a size only where that size has stock", () => {
  // tee-cheap has M listed but none left, so M in stock is tee-mid alone.
  const listing = buildListing(CATALOG, { inStockOnly: true });
  assert.equal(countOf(listing.sizes, "M"), 1);
  assert.equal(countOf(listing.sizes, "S"), 1);
  // The scarf is the only One Size article and it is sold out.
  assert.equal(countOf(listing.sizes, "One Size"), 0);

  assert.equal(countOf(buildListing(CATALOG, {}).sizes, "M"), 2);
});

test("sizes are OR'd within the group and AND'd across groups", () => {
  assert.equal(buildListing(CATALOG, { sizes: ["S", "L"] }).items.length, 2);
  assert.equal(
    buildListing(CATALOG, { sizes: ["S", "L"], price: "under-250" }).items
      .length,
    1,
  );
});

test("facet values come from the catalog in scope, not the whole site", () => {
  // A collection query hands buildListing only its own products; offering a
  // size nothing in scope carries is what made two-click dead ends.
  const listing = buildListing([CATALOG[2]], {});
  assert.deepEqual(
    listing.sizes.map((f) => f.value),
    ["One Size"],
  );
  assert.deepEqual(
    listing.categories.map((f) => f.value),
    ["Accessories"],
  );
});

test("sizes are listed the way clothing is sized", () => {
  const sizes = buildListing(
    [card({ id: "a", sizes: [
      { size: "One Size", stock: 1 },
      { size: "2XL", stock: 1 },
      { size: "S", stock: 1 },
      { size: "L", stock: 1 },
    ] })],
    {},
  ).sizes.map((f) => f.value);

  assert.deepEqual(sizes, ["S", "L", "2XL", "One Size"]);
});
