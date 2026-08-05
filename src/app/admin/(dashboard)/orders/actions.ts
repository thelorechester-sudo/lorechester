"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { notifyShipped } from "@/lib/notify";
import { fieldErrors } from "@/lib/validation";

export type OrderActionState = {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
};

const fulfilSchema = z
  .object({
    orderId: z.uuid(),
    status: z.enum([
      "pending",
      "paid",
      "packed",
      "shipped",
      "delivered",
      "cancelled",
      "expired",
    ]),
    trackingNumber: z.string().max(60).optional(),
    notify: z.boolean().default(true),
  })
  .refine(
    (input) => input.status !== "shipped" || Boolean(input.trackingNumber?.trim()),
    {
      error: "A tracking number is required before an order can be marked shipped.",
      path: ["trackingNumber"],
    },
  );

/**
 * Move an order through fulfilment.
 *
 * Deliberately does NOT touch stock: stock is committed once by the payment
 * webhook, and letting the admin screen move it too would double-count.
 * Cancelling a paid order needs a manual restock, which is the rarer case and
 * better done knowingly.
 */
export async function updateOrder(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  await requireAdmin();

  const parsed = fulfilSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    trackingNumber: formData.get("trackingNumber") || undefined,
    notify: formData.get("notify") === "on",
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const [before] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1);

  if (!before) return { ok: false, errors: { _form: "Order not found." } };

  const [updated] = await db
    .update(orders)
    .set({
      status: input.status,
      trackingNumber: input.trackingNumber?.trim() || before.trackingNumber,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, input.orderId))
    .returning();

  // Only announce the transition into "shipped", and only once.
  if (input.notify && input.status === "shipped" && before.status !== "shipped") {
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, updated.id));
    await notifyShipped({ ...updated, items });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${input.orderId}`);
  revalidatePath(`/orders/${updated.orderNumber}`);

  return {
    ok: true,
    message:
      input.status === "shipped" && input.notify
        ? "Marked shipped and the customer has been messaged."
        : "Order updated.",
  };
}
