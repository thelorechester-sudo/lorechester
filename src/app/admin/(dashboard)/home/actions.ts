"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { HOME_KEY, homeSettingsSchema } from "@/lib/settings";
import { fieldErrors } from "@/lib/validation";
import type { ActionState } from "../products/actions";

export type { ActionState };

export async function saveHome(
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

  const parsed = homeSettingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  /*
   * Blank fields are stripped by the schema's transforms, so they are absent
   * from `value` rather than stored as "". getHomeSettings then falls back to
   * the built-in copy for them — clearing a field restores the default
   * instead of emptying the section.
   */
  await db
    .insert(settings)
    .values({ key: HOME_KEY, value: parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: parsed.data, updatedAt: new Date() },
    });

  // The home page and the layout's marquee both read these.
  revalidatePath("/", "layout");
  revalidatePath("/admin/home");

  return { ok: true };
}
