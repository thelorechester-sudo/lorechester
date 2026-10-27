"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { isPageSlug, pageKey, pageSettingsSchema } from "@/lib/pages";
import { fieldErrors } from "@/lib/validation";
import type { ActionState } from "../products/actions";

export type { ActionState };

const saveSchema = pageSettingsSchema.extend({
  slug: z.string().refine(isPageSlug, "Unknown page"),
});

export async function savePage(
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

  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { slug, ...value } = parsed.data;
  if (!isPageSlug(slug)) return { ok: false, errors: { _form: "Unknown page" } };

  await db
    .insert(settings)
    .values({ key: pageKey(slug), value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });

  revalidatePath(`/${slug}`);
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${slug}`);

  return { ok: true };
}

/** Drops the stored copy so the page shows the built-in wording again. */
export async function resetPage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const slug = String(formData.get("slug") ?? "");
  if (!isPageSlug(slug)) return { ok: false, errors: { _form: "Unknown page" } };

  await db.delete(settings).where(eq(settings.key, pageKey(slug)));

  revalidatePath(`/${slug}`);
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${slug}`);

  return { ok: true, message: "Restored the built-in text." };
}
