"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { SITE_KEY, siteSettingsSchema } from "@/lib/site";
import { fieldErrors } from "@/lib/validation";
import type { ActionState } from "../products/actions";

export type { ActionState };

export async function saveSite(
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

  const parsed = siteSettingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  /*
   * Blank fields are dropped by the schema, so they are absent from `value`
   * and the built-in wording shows through. The free-shipping threshold is
   * read again by checkout on the server, so changing it here changes what
   * customers are charged, not just what the banner says.
   */
  await db
    .insert(settings)
    .values({ key: SITE_KEY, value: parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: parsed.data, updatedAt: new Date() },
    });

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");

  return { ok: true };
}
