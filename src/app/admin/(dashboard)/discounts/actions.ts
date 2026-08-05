"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { discounts } from "@/lib/db/schema";
import { discountInput, fieldErrors } from "@/lib/validation";
import type { ActionState } from "../products/actions";

export type { ActionState };

export async function saveDiscount(
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

  const parsed = discountInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const input = parsed.data;
  // Stored uppercase because checkDiscountCode uppercases what it looks up.
  const code = input.code.trim().toUpperCase();

  const columns = {
    code,
    type: input.type,
    value: input.value,
    minSubtotal: input.minSubtotal,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    usageLimit: input.usageLimit ?? null,
    active: input.active,
  };

  try {
    if (input.id) {
      await db.update(discounts).set(columns).where(eq(discounts.id, input.id));
    } else {
      await db.insert(discounts).values(columns);
    }
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, errors: { code: "That code already exists." } };
    }
    throw error;
  }

  revalidatePath("/admin/discounts");
  redirect("/admin/discounts?saved=1");
}

export async function deleteDiscount(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.delete(discounts).where(eq(discounts.id, id));
  revalidatePath("/admin/discounts");
}
