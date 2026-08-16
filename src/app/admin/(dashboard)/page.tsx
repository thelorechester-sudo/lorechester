import { asc, desc, eq, lte, sql } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";

import { Badge, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
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
  await requireAdmin();

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

  /*
   * One pass over the catalog feeds both sections below. Joining images onto
   * the low-stock query instead would multiply its rows — a product with four
   * photos would list the same low variant four times.
   */
  const catalog = await db.query.products.findMany({
    columns: { id: true, title: true, price: true, status: true },
    with: { images: true },
    orderBy: (p) => desc(p.createdAt),
  });

  const coverById = new Map(
    catalog.map((product) => [
      product.id,
      [...product.images].sort((a, b) => a.position - b.position)[0]?.url ??
        null,
    ]),
  );

  const liveProducts = catalog.filter(
    (product) => product.status === "active",
  );

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
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold">
            Live on store{" "}
            <span className="font-normal text-muted">
              ({liveProducts.length})
            </span>
          </h2>
          <Link
            href="/admin/products"
            className="meta text-muted hover:text-ink"
          >
            Manage
          </Link>
        </div>

        {liveProducts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            Nothing is published yet.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {liveProducts.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-line bg-paper">
                    {coverById.get(product.id) ? (
                      <Image
                        src={coverById.get(product.id)!}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                        className="object-cover transition-opacity group-hover:opacity-85"
                      />
                    ) : (
                      <span className="meta absolute inset-0 flex items-center justify-center text-muted">
                        No image
                      </span>
                    )}
                  </div>
                  <p className="mt-2 truncate text-xs font-medium group-hover:underline">
                    {product.title}
                  </p>
                  <p className="text-xs text-muted">
                    {formatIDR(product.price)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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
                <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded bg-paper">
                  {coverById.get(row.productId) && (
                    <Image
                      src={coverById.get(row.productId)!}
                      alt=""
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  )}
                </div>
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
