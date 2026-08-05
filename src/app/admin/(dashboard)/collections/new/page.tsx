import { asc } from "drizzle-orm";

import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { CollectionForm, EMPTY_COLLECTION } from "../collection-form";

export default async function NewCollectionPage() {
  const allProducts = await db.query.products.findMany({
    columns: { id: true, title: true, status: true },
    orderBy: (p) => asc(p.title),
  });

  return (
    <>
      <PageHeader
        title="New collection"
        description="A drop: a named group of products with its own page."
      />
      <CollectionForm initial={EMPTY_COLLECTION} allProducts={allProducts} />
    </>
  );
}
