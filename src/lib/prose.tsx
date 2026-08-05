import Image from "next/image";

/**
 * Minimal article renderer.
 *
 * ponytail: deliberately not Markdown. Blank lines make paragraphs, `## `
 * makes a heading, and a line that is just an image URL becomes an image —
 * which covers everything a brand journal needs. Swap in `react-markdown` +
 * `rehype-sanitize` the first time someone actually needs tables or footnotes.
 *
 * Nothing here uses dangerouslySetInnerHTML, so a pasted <script> renders as
 * literal text rather than executing.
 */

const IMAGE_LINE = /^https?:\/\/\S+\.(?:jpe?g|png|webp|avif|gif)(?:\?\S*)?$/i;

export function Prose({ body }: { body: string }) {
  const blocks = body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (block.startsWith("## ")) {
          return (
            <h2
              key={index}
              className="pt-4 text-xl font-semibold tracking-tight text-ink"
            >
              {block.slice(3)}
            </h2>
          );
        }

        if (IMAGE_LINE.test(block)) {
          return (
            <div key={index} className="relative aspect-[3/2] overflow-hidden bg-paper">
              <Image
                src={block}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          );
        }

        return (
          <p
            key={index}
            className="whitespace-pre-line text-base leading-relaxed text-muted"
          >
            {block}
          </p>
        );
      })}
    </div>
  );
}
