/*
 * Parser for the plain-text format used by journal articles and the editable
 * store pages. Free of React and of any database import so the admin form and
 * the tests can use it too; the renderer lives in @/lib/prose.
 *
 * ponytail: deliberately not Markdown. Blank lines separate blocks, and a
 * block is one of:
 *   ## Heading
 *   - bullet lines (every line starts with "- ")
 *   | table | rows | (every line starts with "|"; the first row is the header)
 *   a line that is only an image URL or /path
 *   anything else → a paragraph
 * Inline, **bold** and [label](url) work inside paragraphs, bullets and table
 * cells. Nothing is ever interpreted as HTML.
 */

export type ProseBlock =
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "image"; src: string }
  | { type: "paragraph"; text: string };

export type InlinePart =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "link"; text: string; href: string };

const IMAGE_LINE =
  /^(?:https?:\/\/|\/(?!\/))\S+\.(?:jpe?g|png|webp|avif|gif)(?:\?\S*)?$/i;

/** Only absolute http(s) URLs and root-relative paths become links. */
export function isSafeHref(href: string): boolean {
  return /^https?:\/\/\S+$/i.test(href) || (/^\/(?!\/)\S*$/.test(href) && !href.includes(".."));
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function parseProse(body: string): ProseBlock[] {
  const blocks: ProseBlock[] = [];

  for (const raw of body.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const block = raw.trim();
    if (!block) continue;

    const lines = block.split("\n").map((line) => line.trim());

    if (block.startsWith("## ")) {
      blocks.push({ type: "heading", text: block.slice(3).trim() });
    } else if (lines.every((line) => line.startsWith("|"))) {
      // Drop the |---|---| divider row if the author typed one.
      const rows = lines
        .filter((line) => !/^\|[\s:|-]+\|?$/.test(line))
        .map(splitRow);
      const [head = [], ...rest] = rows;
      blocks.push({ type: "table", head, rows: rest });
    } else if (lines.every((line) => line.startsWith("- "))) {
      blocks.push({
        type: "list",
        items: lines.map((line) => line.slice(2).trim()),
      });
    } else if (IMAGE_LINE.test(block) && !block.includes("..")) {
      blocks.push({ type: "image", src: block });
    } else {
      blocks.push({ type: "paragraph", text: block });
    }
  }

  return blocks;
}

const INLINE = /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\))/g;

export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];

  for (const piece of text.split(INLINE)) {
    if (!piece) continue;

    if (piece.startsWith("**") && piece.endsWith("**") && piece.length > 4) {
      parts.push({ type: "bold", text: piece.slice(2, -2) });
      continue;
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(piece);
    if (link && isSafeHref(link[2])) {
      parts.push({ type: "link", text: link[1], href: link[2] });
      continue;
    }

    parts.push({ type: "text", text: piece });
  }

  return parts;
}

/**
 * Replace {{token}} placeholders. A token with no value is left as the
 * fallback (the visible "[EMAIL]" style marker), and a line containing a
 * token whose value is `null` is dropped — used for the free-shipping line
 * when the offer is switched off.
 */
export function fillTokens(
  body: string,
  values: Record<string, string | null>,
): string {
  return body
    .split("\n")
    .filter(
      (line) =>
        !Array.from(line.matchAll(/\{\{(\w+)\}\}/g)).some(
          ([, key]) => values[key] === null,
        ),
    )
    .join("\n")
    .replace(/\{\{(\w+)\}\}/g, (whole, key: string) => values[key] ?? whole);
}
