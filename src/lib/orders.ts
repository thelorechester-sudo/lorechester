import "server-only";

import { randomInt } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { discounts, type Discount } from "@/lib/db/schema";
import type { DiscountRule } from "@/lib/pricing";

/**
 * Crockford-style alphabet: no I, L, O, U — so a customer reading an order
 * number down the phone cannot confuse it with 1 or 0.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** e.g. "LRC-7K3M9QDX" */
export function generateOrderNumber(): string {
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `LRC-${suffix}`;
}

export type DiscountCheck =
  | { ok: true; discount: Discount; rule: DiscountRule }
  | { ok: false; error: string };

/**
 * Look a code up and decide whether it may be used right now.
 *
 * Always called server-side at order time, even when the browser already
 * "validated" it — the browser's answer is a preview, not an authorisation.
 */
export async function checkDiscountCode(
  code: string,
  subtotal: number,
  now = new Date(),
): Promise<DiscountCheck> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Enter a code." };

  const [discount] = await db
    .select()
    .from(discounts)
    .where(eq(discounts.code, normalized))
    .limit(1);

  if (!discount) return { ok: false, error: "That code isn't valid." };
  if (!discount.active) return { ok: false, error: "That code is no longer active." };

  if (discount.startsAt && discount.startsAt > now) {
    return { ok: false, error: "That code isn't active yet." };
  }
  if (discount.endsAt && discount.endsAt <= now) {
    return { ok: false, error: "That code has expired." };
  }
  if (discount.usageLimit != null && discount.usedCount >= discount.usageLimit) {
    return { ok: false, error: "That code has been fully redeemed." };
  }
  if (subtotal < discount.minSubtotal) {
    return {
      ok: false,
      error: `Spend at least ${discount.minSubtotal.toLocaleString("id-ID")} to use this code.`,
    };
  }

  return {
    ok: true,
    discount,
    rule: {
      type: discount.type,
      value: discount.value,
      minSubtotal: discount.minSubtotal,
    },
  };
}

/**
 * Claim one use of a discount.
 *
 * The WHERE clause re-checks the limit, so two orders racing for the last use
 * of a code cannot both succeed — the second update matches zero rows.
 * Returns true when the claim was granted.
 */
export async function claimDiscountUse(
  code: string,
  tx: Pick<typeof db, "update"> = db,
): Promise<boolean> {
  const result = await tx
    .update(discounts)
    .set({ usedCount: sql`${discounts.usedCount} + 1` })
    .where(
      sql`${discounts.code} = ${code.toUpperCase()}
          and (${discounts.usageLimit} is null
               or ${discounts.usedCount} < ${discounts.usageLimit})`,
    )
    .returning({ id: discounts.id });

  return result.length > 0;
}
