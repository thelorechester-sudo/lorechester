import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { showcases } from "@/lib/db/schema";
import { ShowcaseForm, type ShowcaseFormValues } from "../showcase-form";

export default async function EditShowcasePage({
  params,
}: PageProps<"/admin/showcase/[id]">) {
  await requireAdmin();

  const { id } = await params;

  const [[showcase], allProducts] = await Promise.all([
    db.select().from(showcases).where(eq(showcases.id, id)).limit(1),
    db.query.products.findMany({
      columns: { id: true, title: true, status: true },
      orderBy: (p) => asc(p.title),
    }),
  ]);

  if (!showcase) notFound();

  const initial: ShowcaseFormValues = {
    id: showcase.id,
    title: showcase.title,
    caption: showcase.caption,
    images: showcase.images.map((image) => ({ url: image.url, alt: image.alt })),
    linkedProductIds: showcase.linkedProductIds,
    published: showcase.published,
    position: showcase.position,
  };

  return (
    <>
      <PageHeader
        title={showcase.title}
        description={`${showcase.images.length} images · ${showcase.linkedProductIds.length} products tagged`}
      />
      <ShowcaseForm initial={initial} allProducts={allProducts} />
    </>
  );
}
