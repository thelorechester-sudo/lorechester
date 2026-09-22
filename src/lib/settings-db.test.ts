import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { before, test } from "node:test";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";

import * as schema from "./db/schema";
import { settings } from "./db/schema";
import { HOME_KEY, homeSettingsSchema, resolveHome } from "./settings";

/*
 * Round-trips the settings row through a real Postgres, because the parts that
 * can break are the ones a pure test cannot see: that the migration created
 * the table, that jsonb survives the trip intact, and that the upsert in
 * saveHome overwrites rather than duplicating the single row.
 *
 * Own in-memory PGlite, so it needs neither .pglite nor a free lock on it.
 */

const require_ = createRequire(join(process.cwd(), "package.json"));
let db: PostgresJsDatabase<typeof schema>;

before(async () => {
  const { PGlite } = require_("@electric-sql/pglite");
  const { drizzle } = require_("drizzle-orm/pglite");

  const client = new PGlite("memory://");
  const dir = join(process.cwd(), "drizzle");

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    for (const stmt of readFileSync(join(dir, file), "utf8").split(
      "--> statement-breakpoint",
    )) {
      if (stmt.trim()) await client.exec(stmt.trim());
    }
  }
  db = drizzle(client, { schema }) as PostgresJsDatabase<typeof schema>;
});

async function save(value: unknown) {
  const parsed = homeSettingsSchema.parse(value);
  await db
    .insert(settings)
    .values({ key: HOME_KEY, value: parsed, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: parsed, updatedAt: new Date() },
    });
}

async function read() {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, HOME_KEY))
    .limit(1);
  return row;
}

test("the migration created the settings table", async () => {
  assert.deepEqual(await db.select().from(settings), []);
});

test("saved copy survives the round trip and reaches the storefront", async () => {
  await save({ dropHeading: "Get in early", marquee: ["Terraces only"] });

  const row = await read();
  assert.ok(row, "row should exist after save");

  const resolved = resolveHome(homeSettingsSchema.parse(row!.value));
  assert.equal(resolved.dropHeading, "Get in early");
  assert.deepEqual(resolved.marquee, ["Terraces only"]);
  // Untouched fields still fall back to the shipped copy.
  assert.equal(resolved.heroPrimaryCta, "Shop the drop");
});

test("saving again overwrites rather than adding a second row", async () => {
  await save({ dropHeading: "First" });
  await save({ dropHeading: "Second" });

  const rows = await db.select().from(settings);
  assert.equal(rows.length, 1, "upsert should keep exactly one row");
  assert.equal(
    resolveHome(homeSettingsSchema.parse(rows[0].value)).dropHeading,
    "Second",
  );
});

test("clearing a field restores the default instead of blanking it", async () => {
  await save({ dropHeading: "Temporary" });
  await save({ dropHeading: "   " });

  const row = await read();
  const resolved = resolveHome(homeSettingsSchema.parse(row!.value));
  assert.equal(resolved.dropHeading, "Get the drop first");
});
