import assert from "node:assert/strict";
import { test } from "node:test";

/*
 * Regression: production ran out of Postgres connections on every route.
 *
 * `db` is a Proxy that resolves the database on every property access, and the
 * resolved instance was cached on globalThis only when NODE_ENV was not
 * "production". So in production the cache never populated and each
 * `db.query…` constructed a brand new postgres() pool, never reused and never
 * closed. Supabase's pooler hit its 200-connection ceiling and every query
 * failed with (EMAXCONN) max client connections reached.
 *
 * The fix is that the cache is unconditional. This asserts the property that
 * actually matters — repeated access yields one pool — with NODE_ENV forced to
 * production, which is the only mode where it regressed.
 */

const globalForDb = globalThis as unknown as {
  __lorechesterSql?: unknown;
  __lorechesterDb?: unknown;
};

test("the connection pool is reused across property accesses in production", async () => {
  const prevEnv = process.env.NODE_ENV;
  const prevUrl = process.env.DATABASE_URL;
  const prevDemo = process.env.NEXT_PUBLIC_DEMO_MODE;

  // postgres() does not dial until a query is issued, so a syntactically valid
  // URL is enough to construct a pool without touching a real server.
  const env = process.env as Record<string, string | undefined>;
  env.DATABASE_URL = "postgres://user:pw@127.0.0.1:5432/none";
  delete env.NEXT_PUBLIC_DEMO_MODE;
  env.NODE_ENV = "production";

  delete globalForDb.__lorechesterSql;
  delete globalForDb.__lorechesterDb;

  try {
    const { db } = await import("./index");

    // Three separate property accesses — each one runs the Proxy's get trap.
    void db.query;
    void db.select;
    void db.transaction;

    assert.ok(
      globalForDb.__lorechesterDb,
      "resolved database was never cached; every access builds a new pool",
    );
    assert.ok(
      globalForDb.__lorechesterSql,
      "postgres pool was never cached; every access opens new connections",
    );

    const sqlAfterFirst = globalForDb.__lorechesterSql;
    void db.query;
    assert.equal(
      globalForDb.__lorechesterSql,
      sqlAfterFirst,
      "a later access replaced the pool instead of reusing it",
    );
  } finally {
    const pool = globalForDb.__lorechesterSql as
      | { end?: (opts?: unknown) => Promise<void> }
      | undefined;
    await pool?.end?.({ timeout: 0 }).catch(() => {});

    delete globalForDb.__lorechesterSql;
    delete globalForDb.__lorechesterDb;

    if (prevEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = prevEnv;
    if (prevUrl === undefined) delete env.DATABASE_URL;
    else env.DATABASE_URL = prevUrl;
    if (prevDemo !== undefined) env.NEXT_PUBLIC_DEMO_MODE = prevDemo;
  }
});
