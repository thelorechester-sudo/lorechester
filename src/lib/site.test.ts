import assert from "node:assert/strict";
import { test } from "node:test";

import { PAGE_DEFAULTS, PAGE_SLUGS, resolvePage } from "./pages";
import {
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_NAV,
  missingContactDetails,
  pageTokens,
  resolveSite,
  siteSettingsSchema,
} from "./site";

test("an empty settings row renders the built-in store", () => {
  const site = resolveSite({}, 500_000);
  assert.deepEqual(site.nav, DEFAULT_NAV);
  assert.deepEqual(site.footerColumns, DEFAULT_FOOTER_COLUMNS);
  assert.equal(site.freeShippingThreshold, 500_000);
});

test("a stored threshold of 0 switches the offer off rather than falling back", () => {
  assert.equal(resolveSite({ freeShippingThreshold: 0 }, 500_000).freeShippingThreshold, 0);
});

test("blank text fields are dropped so the default shows through", () => {
  const parsed = siteSettingsSchema.parse({ footerMotto: "  ", whatsapp: "0812" });
  assert.equal(parsed.footerMotto, undefined);
  assert.equal(parsed.whatsapp, "0812");
});

test("menu links reject script and protocol-relative targets", () => {
  for (const href of ["javascript:alert(1)", "//evil.com", "/a/../b", "shop"]) {
    assert.equal(
      siteSettingsSchema.safeParse({ nav: [{ label: "x", href }] }).success,
      false,
      href,
    );
  }
  assert.ok(siteSettingsSchema.safeParse({ nav: [{ label: "x", href: "/shop?a=1" }] }).success);
});

test("page tokens keep the visible marker until the detail is filled in", () => {
  const empty = pageTokens(resolveSite({}, 0), String);
  assert.equal(empty.email, "[EMAIL]");
  assert.equal(empty.free_shipping, null);

  const filled = pageTokens(resolveSite({ email: "hi@lorechester.id" }, 100), (n) => `Rp ${n}`);
  assert.equal(filled.email, "hi@lorechester.id");
  assert.equal(filled.free_shipping, "Rp 100");
  assert.deepEqual(missingContactDetails(resolveSite({}, 0)).length, 5);
});

test("every editable page has built-in text and a stored override wins", () => {
  for (const slug of PAGE_SLUGS) {
    assert.ok(PAGE_DEFAULTS[slug].body.length > 50, slug);
  }
  assert.equal(resolvePage("about", { title: "Us" }).title, "Us");
  assert.equal(resolvePage("about", {}).title, "About");
});
