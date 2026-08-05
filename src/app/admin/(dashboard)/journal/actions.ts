"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { articleInput, fieldErrors, slugify } from "@/lib/validation";
import type { ActionState } from "../products/actions";

export type { ActionState };

export async function saveArticle(
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

  const parsed = articleInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const input = parsed.data;
  const slug = slugify(input.slug);

  const [existing] = input.id
    ? await db
        .select({ publishedAt: articles.publishedAt })
        .from(articles)
        .where(eq(articles.id, input.id))
        .limit(1)
    : [];

  const columns = {
    slug,
    title: input.title,
    excerpt: input.excerpt,
    coverImage: input.coverImage ?? null,
    body: input.body,
    status: input.status,
    // Stamp the publish date the first time it goes live, then leave it alone
    // so editing a published post does not reorder the journal.
    publishedAt:
      input.status === "published"
        ? (existing?.publishedAt ?? new Date())
        : (existing?.publishedAt ?? null),
    updatedAt: new Date(),
  };

  try {
    if (input.id) {
      await db.update(articles).set(columns).where(eq(articles.id, input.id));
    } else {
      await db.insert(articles).values(columns);
    }
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, errors: { slug: "That slug is already taken." } };
    }
    throw error;
  }

  revalidatePath("/admin/journal");
  revalidatePath("/journal");
  revalidatePath(`/journal/${slug}`);

  redirect("/admin/journal?saved=1");
}

export async function deleteArticle(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.delete(articles).where(eq(articles.id, id));
  revalidatePath("/admin/journal");
  revalidatePath("/journal");
}
