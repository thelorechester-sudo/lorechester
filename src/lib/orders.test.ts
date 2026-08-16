import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { before, test } from "node:test";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { discounts } from "./db/schema";
import * as schema from "./db/schema";

/*
 * The first database-backed test in this repo.
 *
 * `usageLimit` used to be advisory: checkDiscountCode only read usedCount, and
 * the claim happened at settlement, so every customer who reached checkout
 * inside the payment window passed the check and was honoured. The claim now
 * happens when the order row is written, and is released if that order dies.
 * Both halves are single SQL statements whose correctness is entirely in their
 * WHERE clauses, which is exactly what a unit test of the caller cannot see.
 *
 * Runs against its own in-memory PGlite, so it neither needs .pglite nor
 * collides with a dev server holding that directory open.
 */

const require_ = createRequire(join(process.cwd(), "package.json"));

type Db = PostgresJsDatabase<typeof schema>;

// Imported lazily: pulling @/lib/db at module scope would resolve the real
// database rather than the throwaway one built below.
let claimDiscountUse: typeof import("./orders").claimDiscountUse;
let releaseDiscountUse: typeof import("./orders").releaseDiscountUse;
let db: Db;

before(async () => {
  const { PGlite } = require_("@electric-sql/pglite");
  const { drizzle } = require_("drizzle-orm/pglite");

  const client = new PGlite("memory://");
  const dir = join(process.cwd(), "drizzle");

  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    for (const statement of readFileSync(join(dir, file), "utf8").split(
      "--> statement-breakpoint",
    )) {
      const trimmed = statement.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }

  db = drizzle(client, { schema }) as Db;
  ({ claimDiscountUse, releaseDiscountUse } = await import("./orders"));
});

async function seedDiscount(code: string, usageLimit: number | null) {
  await db.delete(discounts);
  await db.insert(discounts).values({
    code,
    type: "percent",
    value: 50,
    minSubtotal: 0,
    usageLimit,
    usedCount: 0,
    active: true,
  });
}

async function usedCount(): Promise<number> {
  const [row] = await db.select().from(discounts);
  return row.usedCount;
}

test("a limited code can only be claimed up to its limit", async () => {
  await seedDiscount("TERRACE50", 2);

  assert.equal(await claimDiscountUse("TERRACE50", db), true);
  assert.equal(await claimDiscountUse("TERRACE50", db), true);
  // The third checkout is the one that used to be honoured anyway.
  assert.equal(await claimDiscountUse("TERRACE50", db), false);
  assert.equal(await usedCount(), 2);
});

test("an unlimited code never refuses a claim", async () => {
  await seedDiscount("ALWAYS", null);

  for (let i = 0; i < 5; i++) {
    assert.equal(await claimDiscountUse("ALWAYS", db), true);
  }
  assert.equal(await usedCount(), 5);
});

test("claiming is case-insensitive on the code", async () => {
  await seedDiscount("TERRACE50", 1);
  assert.equal(await claimDiscountUse("terrace50", db), true);
  assert.equal(await usedCount(), 1);
});

test("releasing hands the use back so the code works again", async () => {
  await seedDiscount("TERRACE50", 1);

  assert.equal(await claimDiscountUse("TERRACE50", db), true);
  assert.equal(await claimDiscountUse("TERRACE50", db), false);

  // The order died — Snap failed, or Midtrans expired it unpaid.
  await releaseDiscountUse("TERRACE50", db);

  assert.equal(await usedCount(), 0);
  assert.equal(await claimDiscountUse("TERRACE50", db), true);
});

test("release is floored at zero so it cannot mint uses", async () => {
  await seedDiscount("TERRACE50", 1);

  await releaseDiscountUse("TERRACE50", db);
  await releaseDiscountUse("TERRACE50", db);

  assert.equal(await usedCount(), 0);
});

test("concurrent claims for a last use grant exactly one", async () => {
  await seedDiscount("LASTONE", 1);

  const results = await Promise.all(
    Array.from({ length: 8 }, () => claimDiscountUse("LASTONE", db)),
  );

  assert.equal(
    results.filter(Boolean).length,
    1,
    "exactly one concurrent claim should win",
  );
  assert.equal(await usedCount(), 1);
});
