import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { ProductForm, type ProductFormValues } from "../product-form";

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;

  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: { images: true, variants: true },
  });

  if (!product) notFound();

  const initial: ProductFormValues = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    details: product.details,
    status: product.status,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    category: product.category ?? "",
    featured: product.featured,
    weightGrams: product.weightGrams,
    images: [...product.images]
      .sort((a, b) => a.position - b.position)
      .map((image) => ({ id: image.id, url: image.url, alt: image.alt })),
    variants: [...product.variants]
      .sort((a, b) => a.position - b.position)
      .map((variant) => ({
        id: variant.id,
        size: variant.size,
        color: variant.color ?? "",
        sku: variant.sku ?? "",
        stock: variant.stock,
        priceOverride: variant.priceOverride,
      })),
  };

  return (
    <>
      <PageHeader
        title={product.title}
        description={`Last updated ${product.updatedAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`}
        action={
          product.status === "active" ? (
            <Link
              href={`/product/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className="meta text-muted hover:text-ink"
            >
              View on store ↗
            </Link>
          ) : null
        }
      />
      <ProductForm initial={initial} />
    </>
  );
}
