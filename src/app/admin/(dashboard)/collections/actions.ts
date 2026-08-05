"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections, productCollections } from "@/lib/db/schema";
import { collectionInput, fieldErrors, slugify } from "@/lib/validation";
import type { ActionState } from "../products/actions";

export type { ActionState };

export async function saveCollection(
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

  const parsed = collectionInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const input = parsed.data;
  const slug = slugify(input.slug);

  try {
    await db.transaction(async (tx) => {
      let collectionId = input.id;

      const columns = {
        slug,
        title: input.title,
        description: input.description,
        heroImage: input.heroImage ?? null,
        releaseAt: input.releaseAt ?? null,
      };

      if (collectionId) {
        await tx
          .update(collections)
          .set(columns)
          .where(eq(collections.id, collectionId));
      } else {
        const [created] = await tx
          .insert(collections)
          .values(columns)
          .returning({ id: collections.id });
        collectionId = created.id;
      }

      // Membership is a plain join table with no extra columns, so replacing
      // the whole set is simpler than diffing it.
      await tx
        .delete(productCollections)
        .where(eq(productCollections.collectionId, collectionId));

      if (input.productIds.length) {
        await tx.insert(productCollections).values(
          input.productIds.map((productId) => ({ productId, collectionId })),
        );
      }
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "23505"
    ) {
      return { ok: false, errors: { slug: "That slug is already taken." } };
    }
    throw error;
  }

  revalidatePath("/admin/collections");
  revalidatePath("/shop");
  revalidatePath(`/shop/${slug}`);
  revalidatePath("/");

  redirect("/admin/collections?saved=1");
}

export async function deleteCollection(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Cascades to product_collections only — the products themselves survive.
  await db.delete(collections).where(eq(collections.id, id));

  revalidatePath("/admin/collections");
  revalidatePath("/shop");
  revalidatePath("/");
}
