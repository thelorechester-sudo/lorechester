import { asc, eq, lte, sql } from "drizzle-orm";
import Link from "next/link";

import { Badge, PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { products, variants } from "@/lib/db/schema";
import { formatIDR } from "@/lib/money";

/** Anything at or below this is worth restocking before the next drop. */
const LOW_STOCK_THRESHOLD = 3;

function Stat({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: "danger" | "warning";
}) {
  const body = (
    <div className="rounded-lg border border-line bg-paper-pure p-5">
      <p className="meta text-muted">{label}</p>
      <p
        className={
          "mt-2 text-3xl font-semibold tracking-tight " +
          (tone === "danger"
            ? "text-accent"
            : tone === "warning"
              ? "text-amber-700"
              : "text-ink")
        }
      >
        {value}
      </p>
    </div>
  );

  return href ? (
    <Link href={href} className="block transition-opacity hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

export default async function AdminOverviewPage() {
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${products.status} = 'active')::int`,
      draft: sql<number>`count(*) filter (where ${products.status} = 'draft')::int`,
    })
    .from(products);

  const [stockValue] = await db
    .select({
      units: sql<number>`coalesce(sum(${variants.stock}), 0)::int`,
      retail: sql<number>`coalesce(sum(${variants.stock} * coalesce(${variants.priceOverride}, ${products.price})), 0)::bigint`,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id));

  const lowStock = await db
    .select({
      productId: products.id,
      title: products.title,
      size: variants.size,
      stock: variants.stock,
      status: products.status,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(lte(variants.stock, LOW_STOCK_THRESHOLD))
    .orderBy(asc(variants.stock), asc(products.title))
    .limit(15);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Catalog health at a glance. Order figures land here once checkout is live."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={counts.total} href="/admin/products" />
        <Stat label="Live on store" value={counts.active} />
        <Stat
          label="Drafts"
          value={counts.draft}
          tone={counts.draft > 0 ? "warning" : undefined}
        />
        <Stat label="Units in stock" value={stockValue.units} />
      </div>

      <p className="mt-3 text-xs text-muted">
        Stock at retail value: {formatIDR(Number(stockValue.retail))}
      </p>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold">
          Low stock{" "}
          <span className="font-normal text-muted">
            ({LOW_STOCK_THRESHOLD} or fewer left)
          </span>
        </h2>

        {lowStock.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            Nothing running low.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-paper-pure">
            {lowStock.map((row) => (
              <li
                key={`${row.productId}-${row.size}`}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <Link
                  href={`/admin/products/${row.productId}`}
                  className="truncate font-medium hover:underline"
                >
                  {row.title}
                </Link>
                <span className="meta text-muted">{row.size}</span>
                {row.status !== "active" && (
                  <Badge tone="neutral">{row.status}</Badge>
                )}
                <span className="ml-auto shrink-0">
                  {row.stock === 0 ? (
                    <Badge tone="danger">Sold out</Badge>
                  ) : (
                    <Badge tone="warning">{row.stock} left</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
