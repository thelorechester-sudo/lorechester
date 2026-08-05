"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { showcases } from "@/lib/db/schema";
import { fieldErrors, showcaseInput } from "@/lib/validation";
import type { ActionState } from "../products/actions";

export type { ActionState };

export async function saveShowcase(
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

  const parsed = showcaseInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const input = parsed.data;
  const columns = {
    title: input.title,
    caption: input.caption,
    images: input.images,
    linkedProductIds: input.linkedProductIds,
    published: input.published,
    position: input.position,
  };

  if (input.id) {
    await db.update(showcases).set(columns).where(eq(showcases.id, input.id));
  } else {
    await db.insert(showcases).values(columns);
  }

  revalidatePath("/admin/showcase");
  revalidatePath("/");
  revalidatePath("/lookbook");

  redirect("/admin/showcase?saved=1");
}

export async function deleteShowcase(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.delete(showcases).where(eq(showcases.id, id));
  revalidatePath("/admin/showcase");
  revalidatePath("/");
  revalidatePath("/lookbook");
}
