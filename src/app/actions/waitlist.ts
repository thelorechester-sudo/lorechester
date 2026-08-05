"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { normalizeIndonesianPhone } from "@/lib/phone";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const joinSchema = z.object({
  email: z.email("Enter a valid email address"),
  phone: z.string().optional(),
  productId: z.uuid().nullish(),
  variantId: z.uuid().nullish(),
});

export type WaitlistState = { ok: boolean; message?: string; error?: string };

/**
 * "Notify me when this is back" and general drop signups.
 *
 * A repeat signup is a success, not an error — the unique index means the
 * insert is a no-op and the customer sees the same confirmation either way.
 */
export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  /*
   * This is an open, unauthenticated insert, so it needs a ceiling. Ten
   * signups an hour from one address is far above real use and well below
   * anything that would fill the table.
   */
  const limited = rateLimit(`waitlist:${await clientKey()}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });

  if (!limited.ok) {
    return {
      ok: false,
      error: "Too many signups from here. Try again in a little while.",
    };
  }

  const parsed = joinSchema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    productId: formData.get("productId") || null,
    variantId: formData.get("variantId") || null,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const input = parsed.data;
  const phone = input.phone ? normalizeIndonesianPhone(input.phone) : null;

  if (input.phone && !phone) {
    return {
      ok: false,
      error: "That doesn't look like an Indonesian mobile number.",
    };
  }

  try {
    await db
      .insert(waitlist)
      .values({
        email: input.email.trim().toLowerCase(),
        phone,
        productId: input.productId ?? null,
        variantId: input.variantId ?? null,
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error("waitlist insert failed", error);
    return { ok: false, error: "Something went wrong. Try again in a moment." };
  }

  return {
    ok: true,
    message: input.productId
      ? "You're on the list — we'll message you the moment it's back."
      : "You're on the list. We'll tell you before the next drop.",
  };
}
