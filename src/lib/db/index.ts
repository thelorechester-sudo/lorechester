import "server-only";

import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { isLocalDatabase, requireEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Two backends, one `db` export.
 *
 *  - Normal: Supabase Postgres over postgres.js.
 *  - Local (NEXT_PUBLIC_DEMO_MODE=1): PGlite — Postgres compiled to WASM,
 *    running in this process against a file in .pglite/. No Docker, no server,
 *    no account, and everything that needs a database works for real, writes
 *    included. That is what makes /admin usable without Supabase.
 *
 * Both drivers expose the same query API for everything this app does, so no
 * caller branches on which one is live.
 */

const globalForDb = globalThis as unknown as {
  __lorechesterSql?: ReturnType<typeof postgres>;
  __lorechesterDb?: PostgresJsDatabase<typeof schema>;
};

/** Minimal surface of PGlite that the adapter and bootstrap actually use. */
type LocalClient = {
  query: (sql: string) => Promise<{ rows: unknown[] }>;
  exec: (sql: string) => Promise<unknown>;
};

/**
 * Loaded through a runtime `require` rather than an import so the bundler
 * never traces it.
 *
 * `@electric-sql/pglite` is 25 MB of WASM and `drizzle-orm/pglite` imports it
 * as a value, so a static import of either drags the whole thing into every
 * production serverless function — memory and cold-start cost for something
 * only local development uses. Resolving at runtime keeps it out entirely, and
 * keeps this factory synchronous so `db` needs no top-level await (which would
 * break the CJS transform tsx uses for the seed script).
 */
function loadPgliteModules() {
  const req = createRequire(join(process.cwd(), "package.json"));
  const { PGlite } = req("@electric-sql/pglite");
  const { drizzle: drizzlePglite } = req("drizzle-orm/pglite");
  return { PGlite, drizzlePglite };
}

/** Apply the generated migrations if this local database is still empty. */
async function bootstrapLocal(client: LocalClient): Promise<void> {
  const existing = await client.query(
    "select 1 from information_schema.tables where table_schema='public' and table_name='products'",
  );
  if (existing.rows.length > 0) return;

  const dir = join(process.cwd(), "drizzle");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    // drizzle-kit separates statements with this marker.
    for (const statement of readFileSync(join(dir, file), "utf8").split(
      "--> statement-breakpoint",
    )) {
      const trimmed = statement.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }

  console.log(
    `[db] local PGlite database created from ${files.length} migration(s)`,
  );
}

function createLocalDb(): PostgresJsDatabase<typeof schema> {
  const { PGlite, drizzlePglite } = loadPgliteModules();

  /*
   * The client itself is also lazy. Only one process may hold the PGlite
   * directory, and `next build` collects page data across seven workers, each
   * importing this module — constructing eagerly meant six of them aborted on
   * a locked directory. Nothing DB-backed is prerendered, so deferring to the
   * first real query means a build never opens it.
   */
  let client: LocalClient | null = null;
  let ready: Promise<void> | null = null;

  const getClient = (): LocalClient =>
    (client ??= new PGlite(join(process.cwd(), ".pglite")));
  const ensureReady = () => (ready ??= bootstrapLocal(getClient()));

  const lazyClient = new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (prop === "query" || prop === "exec" || prop === "transaction") {
        return async (...args: unknown[]) => {
          await ensureReady();
          const real = getClient() as unknown as Record<
            string,
            (...a: unknown[]) => unknown
          >;
          return real[prop as string](...args);
        };
      }

      const real = getClient() as unknown as Record<string, unknown>;
      const value = real[prop as string];
      return typeof value === "function" ? value.bind(real) : value;
    },
  });

  return drizzlePglite(lazyClient, {
    schema,
  }) as PostgresJsDatabase<typeof schema>;
}

function createRemoteDb(): PostgresJsDatabase<typeof schema> {
  const sql =
    globalForDb.__lorechesterSql ??
    postgres(requireEnv("DATABASE_URL"), {
      // Supabase's transaction pooler does not support prepared statements.
      prepare: false,
      /*
       * The home page fires six queries concurrently (five of its own plus
       * the layout's), so a small pool serialises them and, against the
       * transaction pooler, intermittently stalled that page to a 300s
       * function timeout while every lighter route stayed fine. The
       * connection exhaustion this file used to cause came from building a
       * new pool per query, not from the pool being large — with the cache
       * above that leak is gone, so the ceiling can go back up.
       */
      max: 10,
      // Hand idle connections back rather than holding them for the life of
      // the instance — an instance that served one request at 3am should not
      // still be occupying pooler slots.
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    });

  globalForDb.__lorechesterSql = sql;

  return drizzle(sql, { schema });
}

function resolveDb(): PostgresJsDatabase<typeof schema> {
  if (globalForDb.__lorechesterDb) return globalForDb.__lorechesterDb;

  /*
   * `isLocalDatabase()` and not bare `DEMO_MODE`: it carries the same
   * NODE_ENV !== "production" gate as requireAdmin and proxy.ts. Without it a
   * production deploy carrying the flag would route every read and write to
   * per-instance WASM that is wiped on cold start — orders taken in that
   * window disappear, and their webhooks settle against an unknown order.
   */
  const created = isLocalDatabase() ? createLocalDb() : createRemoteDb();

  /*
   * Cached unconditionally, production included. This was gated on
   * NODE_ENV !== "production" because the reason for caching was a dev
   * concern — stopping a hot-reload from opening a second handle on the same
   * PGlite directory. In production it meant the cache never populated, and
   * `db` below is a Proxy that calls this on *every property access*, so
   * every `db.query…` built a fresh connection pool that was never reused or
   * closed. Supabase's pooler capped out at 200 and every route started
   * failing with EMAXCONN.
   */
  globalForDb.__lorechesterDb = created;
  return created;
}

/**
 * Resolved on first property access, not at import.
 *
 * `next build` imports every module across seven workers while collecting page
 * data. Constructing eagerly meant six of them raced for the PGlite directory
 * and aborted. Nothing DB-backed is prerendered, so a build now never touches
 * the database at all.
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    const target = resolveDb() as unknown as Record<string, unknown>;
    const value = target[prop as string];
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export { schema };
