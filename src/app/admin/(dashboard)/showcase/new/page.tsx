import { asc } from "drizzle-orm";

import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { EMPTY_SHOWCASE, ShowcaseForm } from "../showcase-form";

export default async function NewShowcasePage() {
  const allProducts = await db.query.products.findMany({
    columns: { id: true, title: true, status: true },
    orderBy: (p) => asc(p.title),
  });

  return (
    <>
      <PageHeader
        title="New showcase"
        description="A shoot: images plus the products worn in them."
      />
      <ShowcaseForm initial={EMPTY_SHOWCASE} allProducts={allProducts} />
    </>
  );
}
