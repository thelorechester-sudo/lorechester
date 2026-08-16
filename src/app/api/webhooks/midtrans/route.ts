import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

import { db } from "@/lib/db";
import { orderItems, orders, variants } from "@/lib/db/schema";
import {
  resolveOutcome,
  verifyNotificationSignature,
  type MidtransNotification,
} from "@/lib/midtrans";
import { formatIDR } from "@/lib/money";
import { notifyOwner, notifyPaymentReceived } from "@/lib/notify";
import { releaseDiscountUse } from "@/lib/orders";

/**
 * Midtrans payment notification.
 *
 * Configure the URL in the Midtrans dashboard under
 * Settings → Configuration → Payment Notification URL:
 *   https://your-domain/api/webhooks/midtrans
 *
 * Three things this handler must get right, in order:
 *   1. Verify the signature. Everything else is untrusted until it passes.
 *   2. Verify the amount matches what we recorded for the order.
 *   3. Be idempotent — Midtrans retries, and stock must only ever move once.
 */

export async function POST(request: NextRequest) {
  let notification: MidtransNotification;
  try {
    notification = (await request.json()) as MidtransNotification;
  } catch {
    return Response.json({ error: "Malformed body" }, { status: 400 });
  }

  /* 1. Authenticity -------------------------------------------------------- */
  if (!verifyNotificationSignature(notification)) {
    console.warn(
      "Rejected Midtrans notification with a bad signature:",
      notification.order_id,
    );
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.midtransOrderId, notification.order_id))
    .limit(1);

  if (!order) {
    // 200 so Midtrans stops retrying a notification we can never satisfy.
    console.warn("Notification for unknown order", notification.order_id);
    return Response.json({ received: true, note: "unknown order" });
  }

  /* 2. Amount -------------------------------------------------------------- */
  // gross_amount arrives as "498000.00"; compare against what we stored.
  const notifiedAmount = Math.round(Number(notification.gross_amount));
  if (notifiedAmount !== order.grandTotal) {
    console.error(
      `Amount mismatch on ${order.orderNumber}: notified ${notifiedAmount}, expected ${order.grandTotal}`,
    );
    await notifyOwner(
      `⚠️ Amount mismatch on ${order.orderNumber}. Midtrans says ${formatIDR(notifiedAmount)}, we expected ${formatIDR(order.grandTotal)}. Order NOT marked paid.`,
    );
    return Response.json({ error: "Amount mismatch" }, { status: 409 });
  }

  const outcome = resolveOutcome(notification);

  /* 3. Apply --------------------------------------------------------------- */
  const oversold: string[] = [];
  let didCommitStock = false;

  await db.transaction(async (tx) => {
    // Lock the order row so two concurrent deliveries serialise here.
    const [locked] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, order.id))
      .for("update")
      .limit(1);

    if (!locked) return;

    const shared = {
      midtransTransactionId: notification.transaction_id ?? null,
      paymentMethod: notification.payment_type ?? null,
      updatedAt: new Date(),
    };

    if (outcome !== "paid") {
      /*
       * Never walk an order backwards out of a state it has already reached.
       * Fulfilled orders were always protected; dead ones were not, so a
       * stale `pending` notification arriving after a cancellation put the
       * order back into the admin's live list — and, now that the discount is
       * released on death, would leave it released while the order looked
       * live again.
       */
      const settled = ["paid", "packed", "shipped", "delivered"];
      const dead = ["expired", "cancelled"];
      if (settled.includes(locked.status) || dead.includes(locked.status)) {
        return;
      }

      const status =
        outcome === "pending"
          ? "pending"
          : outcome === "expired"
            ? "expired"
            : "cancelled";

      await tx
        .update(orders)
        .set({ ...shared, status })
        .where(eq(orders.id, locked.id));

      /*
       * Hand the discount use back. Claimed when the order was created, so an
       * order that expires unpaid must not keep consuming a limited code. The
       * guard above makes this run once: a retried expiry finds the order
       * already dead and returns before reaching here.
       */
      if (dead.includes(status) && locked.discountCode) {
        await releaseDiscountUse(locked.discountCode, tx);
      }
      return;
    }

    // ---- paid ------------------------------------------------------------
    // The idempotency gate: stock moves exactly once, on the first delivery
    // that settles this order. A retry finds the timestamp set and skips.
    if (locked.stockCommittedAt) return;

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, locked.id));

    for (const item of items) {
      if (!item.variantId) continue;

      const [variant] = await tx
        .select({ id: variants.id, stock: variants.stock })
        .from(variants)
        .where(eq(variants.id, item.variantId))
        .for("update")
        .limit(1);

      if (!variant) continue;

      if (variant.stock < item.qty) {
        // The customer has already paid, so we honour the sale and flag it
        // rather than failing the webhook. Stock floors at zero.
        oversold.push(
          `${item.titleSnapshot} (${item.sizeSnapshot}) ×${item.qty}, only ${variant.stock} in stock`,
        );
      }

      await tx
        .update(variants)
        .set({ stock: sql`greatest(${variants.stock} - ${item.qty}, 0)` })
        .where(eq(variants.id, item.variantId));
    }

    await tx
      .update(orders)
      .set({
        ...shared,
        status: "paid",
        paidAt: new Date(),
        stockCommittedAt: new Date(),
        note: oversold.length
          ? [locked.note, `OVERSOLD: ${oversold.join("; ")}`]
              .filter(Boolean)
              .join("\n")
          : locked.note,
      })
      .where(eq(orders.id, locked.id));

    didCommitStock = true;
  });

  /* 4. After-effects — never inside the transaction ------------------------ */
  if (didCommitStock) {
    // The discount use was claimed when the order was created, so that
    // usageLimit is enforced before money moves rather than counted after it.
    // Nothing to claim here.

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    await notifyPaymentReceived({ ...order, items });
    await notifyOwner(
      `💰 New paid order ${order.orderNumber} — ${formatIDR(order.grandTotal)}`,
    );

    if (oversold.length) {
      await notifyOwner(
        `⚠️ ${order.orderNumber} oversold: ${oversold.join("; ")}. Contact the customer.`,
      );
    }

    // Stock changed — refresh the catalog pages.
    revalidatePath("/");
    revalidatePath("/shop");
  }

  return Response.json({ received: true });
}
