import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { NextRequest } from "next/server";

import { proxy } from "./proxy";

/*
 * These exercise the real middleware against real NextRequests.
 *
 * A test that only checked `missingStoreEnv()` would have passed while
 * production was down: the bug was that /setup skipped the rewrite and then
 * fell through to `createServerClient(undefined, undefined)`. Only calling
 * proxy() catches that.
 */

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
  "NEXT_PUBLIC_DEMO_MODE",
] as const;

const original = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

function unconfigured() {
  for (const key of KEYS) delete process.env[key];
}

const req = (path: string) =>
  new NextRequest(new URL(`https://lorechester.test${path}`));

test("an unconfigured deploy rewrites to /setup instead of throwing", async () => {
  unconfigured();

  for (const path of ["/", "/shop", "/terms", "/admin", "/admin/login"]) {
    const response = await proxy(req(path));
    assert.equal(
      response.headers.get("x-middleware-rewrite"),
      "https://lorechester.test/setup",
      `${path} should rewrite to /setup`,
    );
  }
});

test("/setup itself does not throw when unconfigured", async () => {
  // The regression. /setup is excluded from the rewrite, so it used to fall
  // through and build a Supabase client from two undefined values — making the
  // page that explains missing config the only one that 500ed on it.
  unconfigured();

  const response = await proxy(req("/setup"));
  assert.ok(response, "proxy returned a response");
  assert.equal(response.headers.get("x-middleware-rewrite"), null);
});

test("a configured deploy does not rewrite to /setup", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";

  // Reaches the Supabase branch and attempts a getUser() call. Whatever it
  // does with an unreachable host, it must not send visitors to /setup.
  const response = await proxy(req("/")).catch(() => null);

  if (response) {
    assert.notEqual(
      response.headers.get("x-middleware-rewrite"),
      "https://lorechester.test/setup",
    );
  }
});
