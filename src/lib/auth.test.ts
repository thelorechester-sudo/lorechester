import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/*
 * `requireAdmin()` used to live only in src/app/admin/(dashboard)/layout.tsx.
 * A Next layout does not gate the segments below it — a partial RSC render
 * that claims the layout is already mounted returns the page on its own, and
 * the layout's check never runs. Every admin page was readable by any
 * signed-in account, because proxy.ts only tests that a user exists and never
 * looks at the role.
 *
 * This asserts the invariant proxy.ts already claims in its own comment:
 * every admin page calls requireAdmin() itself. Sibling actions are covered
 * too, since an action reached directly never passes through a route match.
 */

function adminFiles(pattern: string): string[] {
  return execFileSync(
    "find",
    ["src/app/admin/(dashboard)", "-name", pattern],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);
}

test("every admin page calls requireAdmin", () => {
  const pages = adminFiles("page.tsx");

  // Guards against the find silently matching nothing and the test passing.
  assert.ok(pages.length >= 19, `expected the admin pages, got ${pages.length}`);

  const unguarded = pages.filter(
    (file) => !readFileSync(file, "utf8").includes("requireAdmin()"),
  );

  assert.deepEqual(unguarded, [], "admin pages missing requireAdmin()");
});

test("every admin server action calls requireAdmin", () => {
  const unguarded = adminFiles("actions.ts").filter((file) => {
    const src = readFileSync(file, "utf8");
    // Actions with no privilege of their own opt out by saying so.
    if (src.includes("no-requireAdmin:")) return false;
    return !src.includes("requireAdmin()");
  });

  assert.deepEqual(unguarded, [], "admin actions missing requireAdmin()");
});
