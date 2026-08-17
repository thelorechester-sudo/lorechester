import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Size guide",
  description:
    "Lorechester measurements in centimetres, taken flat. Sizes S through 3XL.",
};

/**
 * Transcribed from the size chart supplied in the ASSET drive (CPS-825).
 * The Indonesian column names are kept alongside the English gloss because
 * that is how the chart is printed on the garment tags.
 */
const COLUMNS = [
  { id: "size", label: "Size", sub: "" },
  { id: "lebar", label: "Width", sub: "Lebar" },
  { id: "panjang", label: "Length", sub: "Panjang" },
  { id: "bahu", label: "Shoulder", sub: "Bahu" },
  { id: "pendek", label: "Short sleeve", sub: "Lengan pendek" },
  { id: "panjangLengan", label: "Long sleeve", sub: "Lengan panjang" },
];

const ROWS = [
  ["S", "46", "66", "11", "21", "52"],
  ["M", "49", "70", "12", "22", "53"],
  ["L", "52", "72", "13", "23", "55"],
  ["XL", "55", "74", "15", "24", "56"],
  ["2XL", "58", "76", "16", "25", "57"],
  ["3XL", "62", "79", "17", "27", "58"],
];

export default function SizeGuidePage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <h1 className="text-headline font-semibold uppercase">Size guide</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        All measurements in centimetres, taken with the garment laid flat. Allow
        1–2 cm either way — everything is cut and sewn in small runs.
      </p>

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <caption className="sr-only">
            Lorechester measurements in centimetres, sizes S to 3XL
          </caption>
          <thead>
            <tr className="border-b-2 border-ink">
              {COLUMNS.map((column) => (
                <th key={column.id} scope="col" className="py-3 pr-3 text-left">
                  <span className="meta block text-ink">{column.label}</span>
                  {column.sub && (
                    <span className="block text-[10px] font-normal italic text-muted">
                      {column.sub}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row[0]} className="border-b border-line">
                <th scope="row" className="py-3 pr-3 text-left font-bold">
                  {row[0]}
                </th>
                {row.slice(1).map((cell, index) => (
                  <td key={index} className="py-3 pr-3 tabular-nums text-xs">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <figure className="mt-12">
        <div className="relative aspect-[16/10] overflow-hidden bg-paper">
          <Image
            src="/brand/size-chart.jpg"
            alt="The Lorechester size chart card, showing the same measurements"
            fill
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
          />
        </div>
        <figcaption className="mt-2 text-xs text-muted">
          The chart as it ships with the garments.
        </figcaption>
      </figure>

      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">Still not sure?</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Measure a shirt you already own and like, lay it flat, and match it
          against the width and length columns above. That beats guessing from
          your usual size, because every brand cuts differently. Message us on
          WhatsApp if you are between two sizes — we will tell you which way the
          particular article runs.
        </p>
      </section>
    </article>
  );
}
