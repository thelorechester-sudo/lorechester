"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { priceCart } from "@/lib/cart";
import { cartItemsSchema } from "@/lib/cart-types";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/config";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { optionalEnv } from "@/lib/env";
import { createSnapTransaction } from "@/lib/midtrans";
import { notifyOrderPlaced } from "@/lib/notify";
import { normalizeIndonesianPhone } from "@/lib/phone";
import { checkDiscountCode, generateOrderNumber } from "@/lib/orders";
import { computeTotals, type DiscountRule } from "@/lib/pricing";
import { getShippingOptions, priceShippingOption } from "@/lib/shipping";
import { fieldErrors } from "@/lib/validation";

/* -------------------------------------------------------------------------- */

const checkoutSchema = z.object({
  email: z.email("Enter a valid email address"),
  phone: z.string().min(1, "WhatsApp number is required"),
  recipientName: z.string().min(2, "Enter the recipient's name").max(100),
  line1: z.string().min(8, "Enter the full street address").max(300),
  areaId: z.string().min(1, "Choose your district from the suggestions"),
  areaLabel: z.string().min(1),
  postalCode: z.string().regex(/^\d{5}$/, "Postal code must be 5 digits"),
  note: z.string().max(500).optional(),
  shippingOptionKey: z.string().min(1, "Choose a shipping option"),
  discountCode: z.string().max(32).optional(),
  items: cartItemsSchema.min(1, "Your bag is empty"),
});

export type CheckoutState = {
  ok: boolean;
  errors?: Record<string, string>;
  /** Snap token — the browser opens the payment popup with it. */
  token?: string;
  orderNumber?: string;
};

/* -------------------------------------------------------------------------- */

/**
 * Quote couriers for an address. Called from the checkout form as soon as a
 * district is selected.
 */
export async function quoteShipping(input: {
  areaId: string;
  postalCode: string;
  items: unknown;
}) {
  const parsedItems = cartItemsSchema.safeParse(input.items);
  if (!parsedItems.success || !/^\d{5}$/.test(input.postalCode)) {
    return { options: [] };
  }

  const cart = await priceCart(parsedItems.data);
  if (cart.subtotal === 0) return { options: [] };

  const options = await getShippingOptions({
    destinationAreaId: input.areaId,
    destinationPostalCode: input.postalCode,
    declaredValue: cart.subtotal,
    totalWeightGrams: cart.totalWeightGrams,
  });

  return { options };
}

/** Preview a discount code without committing to it. */
export async function previewDiscount(code: string, items: unknown) {
  const parsedItems = cartItemsSchema.safeParse(items);
  if (!parsedItems.success) return { ok: false as const, error: "Bag is empty." };

  const cart = await priceCart(parsedItems.data);
  const check = await checkDiscountCode(code, cart.subtotal);

  if (!check.ok) return { ok: false as const, error: check.error };

  const totals = computeTotals({
    subtotal: cart.subtotal,
    discount: check.rule,
    shippingPrice: 0,
    freeShippingThreshold: 0,
  });

  return {
    ok: true as const,
    code: check.discount.code,
    discountTotal: totals.discountTotal,
  };
}

/* -------------------------------------------------------------------------- */

/**
 * Turn a bag into an unpaid order and hand back a Snap token.
 *
 * Everything that decides the amount charged is recomputed here from the
 * database: line prices, the discount, and the courier rate. The only things
 * taken from the browser are *which* variants, *how many*, the address, and
 * *which* courier option was picked.
 *
 * Stock is NOT touched here — it is decremented by the payment webhook once
 * money actually arrives. See src/app/api/webhooks/midtrans/route.ts.
 */
export async function createOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  // Gated on the payment provider, not on demo mode — the local database can
  // record orders perfectly well, but an order with no way to be paid for is
  // worse than a checkout that plainly says it cannot take money yet.
  if (!optionalEnv("MIDTRANS_SERVER_KEY")) {
    return {
      ok: false,
      errors: {
        _form:
          "Payments are not configured yet. Add your Midtrans keys to .env.local to take real orders — see AGENTS.md.",
      },
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { ok: false, errors: { _form: "Could not read the checkout form." } };
  }

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const phone = normalizeIndonesianPhone(input.phone);
  if (!phone) {
    return {
      ok: false,
      errors: { phone: "Enter an Indonesian mobile number, e.g. 0812 3456 7890" },
    };
  }

  /* 1. Price the bag from the database. ---------------------------------- */
  const cart = await priceCart(input.items);

  if (cart.lines.length === 0 || cart.subtotal === 0) {
    return { ok: false, errors: { _form: "Your bag is empty." } };
  }

  const short = cart.lines.filter((line) => line.fulfillableQty < line.qty);
  if (short.length > 0) {
    return {
      ok: false,
      errors: {
        _form:
          cart.issues.join(" ") ||
          "Some items sold out while you were checking out. Please review your bag.",
      },
    };
  }

  /* 2. Resolve the discount server-side. --------------------------------- */
  let rule: DiscountRule | null = null;
  let discountCode: string | null = null;

  if (input.discountCode?.trim()) {
    const check = await checkDiscountCode(input.discountCode, cart.subtotal);
    if (!check.ok) return { ok: false, errors: { discountCode: check.error } };
    rule = check.rule;
    discountCode = check.discount.code;
  }

  /* 3. Re-quote the chosen courier. -------------------------------------- */
  const shipping = await priceShippingOption(
    {
      destinationAreaId: input.areaId,
      destinationPostalCode: input.postalCode,
      declaredValue: cart.subtotal,
      totalWeightGrams: cart.totalWeightGrams,
    },
    input.shippingOptionKey,
  );

  if (!shipping) {
    return {
      ok: false,
      errors: {
        shippingOptionKey:
          "That courier is no longer available for this address. Pick another.",
      },
    };
  }

  /* 4. Totals. ------------------------------------------------------------ */
  const totals = computeTotals({
    subtotal: cart.subtotal,
    discount: rule,
    shippingPrice: shipping.price,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  });

  if (totals.grandTotal <= 0) {
    // Midtrans rejects a zero gross_amount, and a free order should be handled
    // deliberately rather than by accident.
    return {
      ok: false,
      errors: {
        _form: "This order totals nothing to pay. Please contact us directly.",
      },
    };
  }

  /* 5. Persist the unpaid order. ----------------------------------------- */
  const user = await getCurrentUser();
  const orderNumber = generateOrderNumber();

  const [order] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(orders)
      .values({
        orderNumber,
        midtransOrderId: orderNumber,
        email: input.email.toLowerCase().trim(),
        phone,
        customerId: user?.id ?? null,
        status: "pending",
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        shippingTotal: totals.shippingTotal,
        grandTotal: totals.grandTotal,
        discountCode,
        shippingAddress: {
          recipientName: input.recipientName.trim(),
          phone,
          line1: input.line1.trim(),
          areaId: input.areaId,
          areaLabel: input.areaLabel,
          postalCode: input.postalCode,
          note: input.note?.trim() || undefined,
        },
        courier: shipping.courierName,
        courierService: shipping.serviceName,
        note: input.note?.trim() || null,
      })
      .returning();

    await tx.insert(orderItems).values(
      cart.lines.map((line) => ({
        orderId: created.id,
        variantId: line.variantId,
        titleSnapshot: line.title,
        sizeSnapshot: line.size,
        imageSnapshot: line.image,
        priceSnapshot: line.unitPrice,
        qty: line.fulfillableQty,
      })),
    );

    return [created];
  });

  /* 6. Snap token. -------------------------------------------------------- */
  try {
    const snapItems = cart.lines.map((line) => ({
      id: line.variantId,
      name: `${line.title} (${line.size})`,
      price: line.unitPrice,
      quantity: line.fulfillableQty,
    }));

    if (totals.discountTotal > 0) {
      snapItems.push({
        id: "discount",
        name: `Discount ${discountCode ?? ""}`.trim(),
        price: -totals.discountTotal,
        quantity: 1,
      });
    }
    if (totals.shippingTotal > 0) {
      snapItems.push({
        id: "shipping",
        name: `Shipping — ${shipping.courierName} ${shipping.serviceName}`,
        price: totals.shippingTotal,
        quantity: 1,
      });
    }

    const snap = await createSnapTransaction({
      orderId: orderNumber,
      grossAmount: totals.grandTotal,
      items: snapItems,
      customer: {
        firstName: input.recipientName.trim(),
        email: input.email.toLowerCase().trim(),
        phone,
      },
    });

    await db
      .update(orders)
      .set({ snapToken: snap.token, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    /*
     * Tell the customer their order is reserved. This matters most for bank
     * transfer and virtual account, where payment can take hours — they need a
     * link back to the order after closing the tab. Best-effort: a failed
     * message must not lose them a working payment link.
     */
    void notifyOrderPlaced({
      ...order,
      items: cart.lines.map((line) => ({
        titleSnapshot: line.title,
        sizeSnapshot: line.size,
        qty: line.fulfillableQty,
      })),
    }).catch((error) => console.error("notifyOrderPlaced failed", error));

    return { ok: true, token: snap.token, orderNumber };
  } catch (error) {
    // The order row exists but can never be paid, so close it out rather than
    // leaving a permanently pending order in the admin.
    console.error("Midtrans Snap failed", error);
    await db
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    return {
      ok: false,
      errors: {
        _form:
          "We couldn't reach the payment provider. Nothing was charged — please try again.",
      },
    };
  }
}
