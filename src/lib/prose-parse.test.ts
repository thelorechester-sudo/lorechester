import assert from "node:assert/strict";
import { test } from "node:test";

import { fillTokens, isSafeHref, parseInline, parseProse } from "./prose-parse";

test("blocks: headings, bullets, tables, images and paragraphs", () => {
  const blocks = parseProse(
    [
      "## Shipping",
      "- one\n- **two**",
      "| Size | Width |\n|---|---|\n| S | 46 |",
      "/brand/size-chart.jpg",
      "Plain text.",
    ].join("\n\n"),
  );

  assert.deepEqual(
    blocks.map((block) => block.type),
    ["heading", "list", "table", "image", "paragraph"],
  );
  const table = blocks[2];
  assert.ok(table.type === "table");
  assert.deepEqual(table.head, ["Size", "Width"]);
  assert.deepEqual(table.rows, [["S", "46"]]);
});

test("a protocol-relative or traversing image path is not an image", () => {
  assert.equal(parseProse("//evil.com/a.jpg")[0].type, "paragraph");
  assert.equal(parseProse("/../secret.png")[0].type, "paragraph");
});

test("links only accept http(s) and root-relative targets", () => {
  assert.ok(isSafeHref("/shop"));
  assert.ok(isSafeHref("https://example.com/a"));
  assert.ok(!isSafeHref("javascript:alert(1)"));
  assert.ok(!isSafeHref("//evil.com"));
  assert.ok(!isSafeHref("/a/../b"));

  const parts = parseInline("go [here](javascript:alert(1)) or [there](/shop) **now**");
  assert.deepEqual(
    parts.map((part) => part.type),
    ["text", "text", "text", "link", "text", "bold"],
  );
});

test("tokens: filled, left visible when unknown, and null drops the line", () => {
  const out = fillTokens("Mail {{email}}\nFree over {{free_shipping}}\nKeep", {
    email: "a@b.id",
    free_shipping: null,
  });
  assert.equal(out, "Mail a@b.id\nKeep");
  assert.equal(fillTokens("x {{nope}}", {}), "x {{nope}}");
});
