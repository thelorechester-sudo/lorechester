import { desc } from "drizzle-orm";
import Link from "next/link";

import { Badge, Button, EmptyState, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DeleteCollectionButton } from "./delete-button";

export default async function CollectionsPage({
  searchParams,
}: PageProps<"/admin/collections">) {
  await requireAdmin();

  const { saved } = await searchParams;

  const rows = await db.query.collections.findMany({
    with: { products: true },
    orderBy: (c) => desc(c.createdAt),
  });

  // Server Component: this runs once per request, not during a client render.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <>
      <PageHeader
        title="Collections"
        description="Group products into drops. Each one gets its own /shop page."
        action={
          <Link href="/admin/collections/new">
            <Button>New collection</Button>
          </Link>
        }
      />

      {saved && (
        <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Collection saved.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No collections yet"
          description="A collection is a drop — a named group of products with its own hero image and landing page."
          action={
            <Link href="/admin/collections/new">
              <Button>New collection</Button>
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((collection) => {
            const upcoming =
              collection.releaseAt && collection.releaseAt.getTime() > now;

            return (
              <li
                key={collection.id}
                className="overflow-hidden rounded-lg border border-line bg-paper-pure"
              >
                <div
                  className="h-32 bg-paper bg-cover bg-center"
                  style={
                    collection.heroImage
                      ? { backgroundImage: `url(${collection.heroImage})` }
                      : undefined
                  }
                />
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/admin/collections/${collection.id}`}
                      className="font-medium hover:underline"
                    >
                      {collection.title}
                    </Link>
                    {upcoming && <Badge tone="warning">Upcoming</Badge>}
                  </div>

                  <p className="text-xs text-muted">
                    /shop/{collection.slug} · {collection.products.length}{" "}
                    {collection.products.length === 1 ? "product" : "products"}
                  </p>

                  {collection.releaseAt && (
                    <p className="meta text-muted">
                      Drops{" "}
                      {collection.releaseAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Link href={`/admin/collections/${collection.id}`}>
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <DeleteCollectionButton
                      id={collection.id}
                      title={collection.title}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
