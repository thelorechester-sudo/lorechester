import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_HOME, homeSettingsSchema, resolveHome } from "./settings";

/*
 * The contract the admin form depends on: an empty field means "use the
 * shipped wording", never "render nothing". If these regress, clearing a box
 * in /admin/home blanks a section of the storefront instead of restoring it.
 */

test("an empty settings row renders the shipped copy", () => {
  const resolved = resolveHome({});

  assert.equal(resolved.heroPrimaryCta, DEFAULT_HOME.heroPrimaryCta);
  assert.equal(resolved.editorialHeading, DEFAULT_HOME.editorialHeading);
  assert.deepEqual(resolved.marquee, DEFAULT_HOME.marquee);
});

test("blank strings are stripped rather than stored", () => {
  const parsed = homeSettingsSchema.parse({
    heroPrimaryCta: "   ",
    dropHeading: "Get in early",
  });

  assert.equal(
    parsed.heroPrimaryCta,
    undefined,
    "whitespace should not count as a value",
  );
  assert.equal(parsed.dropHeading, "Get in early");

  // …and a stripped field falls back rather than blanking the button.
  assert.equal(resolveHome(parsed).heroPrimaryCta, DEFAULT_HOME.heroPrimaryCta);
  assert.equal(resolveHome(parsed).dropHeading, "Get in early");
});

test("an empty marquee list falls back instead of emptying the ticker", () => {
  const parsed = homeSettingsSchema.parse({ marquee: [] });
  assert.deepEqual(resolveHome(parsed).marquee, DEFAULT_HOME.marquee);
});

test("a set marquee replaces the defaults outright", () => {
  const parsed = homeSettingsSchema.parse({ marquee: ["One", "Two"] });
  assert.deepEqual(resolveHome(parsed).marquee, ["One", "Two"]);
});

test("overlong copy is rejected rather than silently truncated", () => {
  const tooLong = homeSettingsSchema.safeParse({
    heroPrimaryCta: "x".repeat(41),
  });
  assert.equal(tooLong.success, false);
});

test("a hero image path is accepted, a junk one is not", () => {
  assert.equal(
    homeSettingsSchema.safeParse({ heroImage: "/lookbook/nchu-11.jpg" }).success,
    true,
  );
  assert.equal(
    homeSettingsSchema.safeParse({ heroImage: "javascript:alert(1)" }).success,
    false,
  );
});
