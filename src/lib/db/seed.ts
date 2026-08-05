/**
 * Development seed. Idempotent — re-running replaces these rows.
 *
 *   npm run db:seed
 *
 * Mirrors the demo fixtures in src/lib/demo.ts, so a seeded database looks the
 * same as demo mode. Images point at the real brand assets in /public.
 * Names, prices and stock are placeholders — edit them from the admin.
 */
import { inArray } from "drizzle-orm";

import { db } from "./index";
import {
  collections,
  discounts,
  productCollections,
  productImages,
  products,
  variants,
} from "./schema";
import { demoArticles, demoProducts, demoShowcases } from "@/lib/demo";
import { articles, showcases } from "./schema";

async function main() {
  console.log("Seeding…");

  const slugs = demoProducts.map((p) => p.slug);
  const collectionSlugs = ["nchu-0126", "sporting-goods"];

  // Cascades to images, variants and collection membership.
  await db.delete(products).where(inArray(products.slug, slugs));
  await db.delete(collections).where(inArray(collections.slug, collectionSlugs));
  await db
    .delete(articles)
    .where(inArray(articles.slug, demoArticles.map((a) => a.slug)));
  await db.delete(showcases);

  const [nchu, sporting] = await db
    .insert(collections)
    .values([
      {
        slug: "nchu-0126",
        title: "No City Humbles Us",
        description:
          "Article NCHU-0126. Shot across one afternoon between a studio wall and the back seat of a Corolla.",
        heroImage: "/lookbook/nchu-11.jpg",
      },
      {
        slug: "sporting-goods",
        title: "Sporting Goods",
        description:
          "The football articles — goalmouths, typefaces and the crazy sporting game itself.",
        heroImage: "/lookbook/goal-02.jpg",
      },
    ])
    .returning();

  const insertedIds = new Map<string, string>();

  for (const [index, spec] of demoProducts.entries()) {
    const [product] = await db
      .insert(products)
      .values({
        slug: spec.slug,
        title: spec.title,
        description: spec.description,
        details: spec.details,
        status: "active",
        price: spec.price,
        compareAtPrice: spec.compareAtPrice,
        category: spec.category,
        featured: spec.featured,
        weightGrams: spec.weightGrams,
      })
      .returning();

    insertedIds.set(spec.slug, product.id);

    await db.insert(productImages).values(
      spec.images.map((image, position) => ({
        productId: product.id,
        url: image.url,
        alt: image.alt,
        position,
      })),
    );

    await db.insert(variants).values(
      spec.variants.map((variant, position) => ({
        productId: product.id,
        size: variant.size,
        sku: variant.sku,
        stock: variant.stock,
        position,
      })),
    );

    // NCHU articles into the NCHU drop, everything else into Sporting Goods.
    await db.insert(productCollections).values({
      productId: product.id,
      collectionId: spec.slug.startsWith("no-city") ? nchu.id : sporting.id,
    });

    console.log(`  ${index + 1}. ${spec.title}`);
  }

  await db.insert(articles).values(
    demoArticles.map((article) => ({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      coverImage: article.coverImage,
      body: article.body,
      status: article.status,
      publishedAt: article.publishedAt,
    })),
  );

  await db.insert(showcases).values(
    demoShowcases.map((showcase) => ({
      title: showcase.title,
      caption: showcase.caption,
      images: showcase.images,
      // Remap the fixture ids onto the ids Postgres just generated.
      linkedProductIds: showcase.linkedProductIds
        .map((fixtureId) => {
          const match = demoProducts.find((p) => p.id === fixtureId);
          return match ? insertedIds.get(match.slug) : undefined;
        })
        .filter((value): value is string => Boolean(value)),
      published: showcase.published,
      position: showcase.position,
    })),
  );

  await db
    .insert(discounts)
    .values({
      code: "TERRACES10",
      type: "percent",
      value: 10,
      minSubtotal: 300_000,
      active: true,
    })
    .onConflictDoNothing();

  console.log(
    `Done — ${demoProducts.length} products, 2 collections, ${demoArticles.length} articles, ${demoShowcases.length} showcases, 1 discount code.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
