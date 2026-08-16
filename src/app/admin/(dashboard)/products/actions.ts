"use server";

import { and, eq, notInArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { productImages, products, variants } from "@/lib/db/schema";
import { fieldErrors, productInput, slugify } from "@/lib/validation";

export type ActionState = {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
};

/** Postgres unique-constraint violation. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === UNIQUE_VIOLATION
  );
}

/**
 * Create or update a product together with its variants and images.
 *
 * The whole thing is one transaction: a half-saved product with the new price
 * but the old stock rows is worse than a failed save.
 */
export async function saveProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { ok: false, errors: { _form: "Could not read the form data." } };
  }

  const parsed = productInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const input = parsed.data;
  const slug = slugify(input.slug);

  try {
    await db.transaction(async (tx) => {
      let productId = input.id;

      const columns = {
        slug,
        title: input.title,
        description: input.description,
        details: input.details,
        status: input.status,
        price: input.price,
        compareAtPrice: input.compareAtPrice ?? null,
        category: input.category || null,
        featured: input.featured,
        weightGrams: input.weightGrams,
        updatedAt: new Date(),
      };

      if (productId) {
        await tx.update(products).set(columns).where(eq(products.id, productId));
      } else {
        const [created] = await tx
          .insert(products)
          .values(columns)
          .returning({ id: products.id });
        productId = created.id;
      }

      // Variants are updated in place rather than replaced: order_items point
      // at variant ids, and deleting a variant nulls that link on past orders.
      const keptIds = input.variants
        .map((v) => v.id)
        .filter((id): id is string => Boolean(id));

      await tx
        .delete(variants)
        .where(
          keptIds.length
            ? and(
                eq(variants.productId, productId),
                notInArray(variants.id, keptIds),
              )
            : eq(variants.productId, productId),
        );

      for (const [position, variant] of input.variants.entries()) {
        const values = {
          productId,
          size: variant.size.trim(),
          color: variant.color?.trim() || null,
          sku: variant.sku?.trim() || null,
          stock: variant.stock,
          priceOverride: variant.priceOverride ?? null,
          position,
        };

        if (variant.id) {
          /*
           * Stock is applied as a delta, not as the absolute the form is
           * holding. The payment webhook decrements this same column, so a
           * form opened before a sale and saved after it would otherwise write
           * the pre-sale count back and resell units already paid for — with
           * no oversell warning, because the number looks healthy.
           *
           * `stockAt` is the count the form was rendered with. Editing 3 -> 10
           * means "+7", and stays +7 even if a webhook took 2 in between.
           * Clamped at 0 the same way the webhook clamps its decrement.
           */
          const delta =
            variant.stockAt === undefined
              ? undefined
              : variant.stock - variant.stockAt;

          await tx
            .update(variants)
            .set(
              delta === undefined
                ? values
                : {
                    ...values,
                    stock: sql`greatest(${variants.stock} + ${delta}, 0)`,
                  },
            )
            .where(eq(variants.id, variant.id));
        } else {
          await tx.insert(variants).values(values);
        }
      }

      // Images carry no foreign keys, so a straight replace is safe.
      await tx.delete(productImages).where(eq(productImages.productId, productId));
      if (input.images.length) {
        await tx.insert(productImages).values(
          input.images.map((image, position) => ({
            productId,
            url: image.url,
            alt: image.alt,
            position,
          })),
        );
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        errors: { slug: "Another product already uses this slug." },
      };
    }
    throw error;
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/product/${slug}`);
  revalidatePath("/");

  redirect("/admin/products?saved=1");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Archiving instead of deleting would keep order history prettier, but the
  // snapshots on order_items already cover that, so a real delete is fine.
  await db.delete(products).where(eq(products.id, id));

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function setProductStatus(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !["draft", "active", "archived"].includes(status)) return;

  await db
    .update(products)
    .set({ status: status as "draft" | "active" | "archived", updatedAt: new Date() })
    .where(eq(products.id, id));

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
}
