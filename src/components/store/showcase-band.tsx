import Image from "next/image";
import Link from "next/link";

import { SectionHead } from "./section-head";
import { getShowcaseProducts } from "@/lib/content";
import type { Showcase } from "@/lib/db/schema";
import { formatIDR } from "@/lib/money";

/**
 * A lookbook shoot with a "shop the look" strip underneath — the shortest path
 * from "that looks good" to "add to bag".
 */
export async function ShowcaseBand({ showcase }: { showcase: Showcase }) {
  const tagged = await getShowcaseProducts(showcase.linkedProductIds);
  const [lead, ...rest] = showcase.images;

  if (!lead) return null;

  return (
    <section className="border-t border-line py-16">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8">
        <SectionHead
          index="03"
          title={showcase.title}
          href="/lookbook"
          linkLabel="All shoots"
        />

        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative aspect-[4/5] overflow-hidden bg-paper md:col-span-2 md:aspect-[16/10]">
            <Image
              src={lead.url}
              alt={lead.alt || showcase.title}
              fill
              sizes="(max-width: 768px) 100vw, 66vw"
              className="object-cover"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            {rest.slice(0, 2).map((image) => (
              <div
                key={image.url}
                className="relative aspect-[4/5] overflow-hidden bg-paper md:aspect-auto md:h-full"
              >
                <Image
                  src={image.url}
                  alt={image.alt || ""}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {showcase.caption && (
          <p className="mt-5 max-w-prose text-sm leading-relaxed text-muted">
            {showcase.caption}
          </p>
        )}

        {tagged.length > 0 && (
          <div className="mt-8">
            <p className="meta mb-3 text-muted">Shop the look</p>
            <ul className="flex flex-wrap gap-3">
              {tagged.map((product) => {
                const cover = [...product.images].sort(
                  (a, b) => a.position - b.position,
                )[0];

                return (
                  <li key={product.id}>
                    <Link
                      href={`/product/${product.slug}`}
                      className="flex items-center gap-3 border border-line bg-paper-pure p-2 pr-4 transition-colors hover:border-ink"
                    >
                      <div className="relative aspect-square w-12 shrink-0 overflow-hidden bg-paper">
                        {cover && (
                          <Image
                            src={cover.url}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <span className="text-sm">
                        {product.title}
                        <span className="meta ml-2 text-muted">
                          {formatIDR(product.price)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
