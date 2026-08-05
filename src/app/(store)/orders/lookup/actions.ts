"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";

const lookupSchema = z.object({
  email: z.email("Enter the email you ordered with"),
  orderNumber: z.string().min(4, "Enter your order number").max(32),
});

export type LookupState = { error?: string };

/** Small, fixed delay so timing can't be used to probe which emails exist. */
const MIN_RESPONSE_MS = 400;

export async function lookupOrder(
  _prev: LookupState,
  formData: FormData,
): Promise<LookupState> {
  const started = Date.now();

  const parsed = lookupSchema.safeParse({
    email: formData.get("email"),
    orderNumber: formData.get("orderNumber"),
  });

  const pad = async () => {
    const elapsed = Date.now() - started;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_RESPONSE_MS - elapsed));
    }
  };

  if (!parsed.success) {
    await pad();
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const orderNumber = parsed.data.orderNumber.trim().toUpperCase();
  const email = parsed.data.email.trim().toLowerCase();

  const [order] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.email, email)))
    .limit(1);

  await pad();

  // One message for both "no such order" and "wrong email" — telling them
  // apart would confirm which order numbers exist.
  if (!order) {
    return { error: "We couldn't find an order with those details." };
  }

  redirect(`/orders/${order.orderNumber}`);
}
