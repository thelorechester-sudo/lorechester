import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { CollectionForm, type CollectionFormValues } from "../collection-form";

/** Date -> "2024-11-08T19:00", the format `datetime-local` expects. */
function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default async function EditCollectionPage({
  params,
}: PageProps<"/admin/collections/[id]">) {
  const { id } = await params;

  const [collection, allProducts] = await Promise.all([
    db.query.collections.findFirst({
      where: eq(collections.id, id),
      with: { products: true },
    }),
    db.query.products.findMany({
      columns: { id: true, title: true, status: true },
      orderBy: (p) => asc(p.title),
    }),
  ]);

  if (!collection) notFound();

  const initial: CollectionFormValues = {
    id: collection.id,
    title: collection.title,
    slug: collection.slug,
    description: collection.description,
    heroImage: collection.heroImage,
    releaseAt: collection.releaseAt ? toLocalInputValue(collection.releaseAt) : "",
    productIds: collection.products.map((link) => link.productId),
  };

  return (
    <>
      <PageHeader title={collection.title} description={`/shop/${collection.slug}`} />
      <CollectionForm initial={initial} allProducts={allProducts} />
    </>
  );
}
