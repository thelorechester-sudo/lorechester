import { desc } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";

import { Badge, Button, EmptyState, PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatIDR } from "@/lib/money";
import { DeleteProductButton } from "./delete-button";

const STATUS_TONE = {
  active: "positive",
  draft: "warning",
  archived: "neutral",
} as const;

export default async function ProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  const { saved } = await searchParams;

  const rows = await db.query.products.findMany({
    with: { images: true, variants: true },
    orderBy: (p) => desc(p.createdAt),
  });

  return (
    <>
      <PageHeader
        title="Products"
        description={`${rows.length} ${rows.length === 1 ? "product" : "products"} in the catalog`}
        action={
          <Link href="/admin/products/new">
            <Button>New product</Button>
          </Link>
        }
      />

      {saved && (
        <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Product saved.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first piece, or run npm run db:seed to load demo data."
          action={
            <Link href="/admin/products/new">
              <Button>New product</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-paper-pure">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="meta px-4 py-3 text-muted">Product</th>
                <th className="meta px-4 py-3 text-muted">Status</th>
                <th className="meta px-4 py-3 text-muted">Price</th>
                <th className="meta px-4 py-3 text-muted">Stock</th>
                <th className="meta px-4 py-3 text-right text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => {
                const cover = product.images.sort(
                  (a, b) => a.position - b.position,
                )[0];
                const totalStock = product.variants.reduce(
                  (sum, v) => sum + v.stock,
                  0,
                );
                const soldOutSizes = product.variants.filter((v) => v.stock === 0);

                return (
                  <tr
                    key={product.id}
                    className="border-b border-line last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded bg-paper">
                          {cover && (
                            <Image
                              src={cover.url}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="block truncate font-medium hover:underline"
                          >
                            {product.title}
                          </Link>
                          <p className="truncate text-xs text-muted">
                            /{product.slug}
                            {product.category ? ` · ${product.category}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[product.status]}>
                        {product.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatIDR(product.price)}
                      {product.compareAtPrice && (
                        <span className="ml-1.5 text-muted line-through">
                          {formatIDR(product.compareAtPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          totalStock === 0
                            ? "font-medium text-accent"
                            : totalStock <= 5
                              ? "font-medium text-amber-700"
                              : ""
                        }
                      >
                        {totalStock}
                      </span>
                      {soldOutSizes.length > 0 && totalStock > 0 && (
                        <span className="ml-1.5 text-xs text-muted">
                          ({soldOutSizes.map((v) => v.size).join(", ")} out)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/products/${product.id}`}>
                          <Button variant="secondary" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <DeleteProductButton
                          id={product.id}
                          title={product.title}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
