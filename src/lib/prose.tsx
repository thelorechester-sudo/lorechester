import Image from "next/image";
import Link from "next/link";

import { parseInline, parseProse } from "@/lib/prose-parse";

/**
 * Renderer for the format described in @/lib/prose-parse.
 *
 * Nothing here uses dangerouslySetInnerHTML, so a pasted <script> renders as
 * literal text rather than executing.
 */

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, index) => {
        if (part.type === "bold") {
          return (
            <strong key={index} className="font-semibold text-ink">
              {part.text}
            </strong>
          );
        }
        if (part.type === "link") {
          return part.href.startsWith("/") ? (
            <Link key={index} href={part.href} className="text-ink underline">
              {part.text}
            </Link>
          ) : (
            <a
              key={index}
              href={part.href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-ink underline"
            >
              {part.text}
            </a>
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </>
  );
}

export function Prose({
  body,
  size = "base",
}: {
  body: string;
  /** "sm" matches the policy pages; "base" is the journal's reading size. */
  size?: "base" | "sm";
}) {
  const text = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="space-y-5">
      {parseProse(body).map((block, index) => {
        switch (block.type) {
          case "heading":
            return (
              <h2
                key={index}
                className="pt-4 text-xl font-semibold tracking-tight text-ink"
              >
                {block.text}
              </h2>
            );

          case "list":
            return (
              <ul
                key={index}
                className={`list-disc space-y-2 pl-5 leading-relaxed text-muted marker:text-line ${text}`}
              >
                {block.items.map((item, i) => (
                  <li key={i}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );

          case "table":
            return (
              <div key={index} className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      {block.head.map((cell, i) => (
                        <th
                          key={i}
                          scope="col"
                          className="meta py-3 pr-3 text-left text-ink"
                        >
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r} className="border-b border-line">
                        {row.map((cell, c) =>
                          c === 0 ? (
                            <th
                              key={c}
                              scope="row"
                              className="py-3 pr-3 text-left font-bold"
                            >
                              {cell}
                            </th>
                          ) : (
                            <td key={c} className="py-3 pr-3 tabular-nums text-xs">
                              {cell}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "image":
            return (
              <div
                key={index}
                className="relative aspect-[3/2] overflow-hidden bg-paper"
              >
                <Image
                  src={block.src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover"
                />
              </div>
            );

          default:
            return (
              <p
                key={index}
                className={`whitespace-pre-line leading-relaxed text-muted ${text}`}
              >
                <Inline text={block.text} />
              </p>
            );
        }
      })}
    </div>
  );
}
