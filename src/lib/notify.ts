import "server-only";

import { optionalEnv, siteUrl } from "@/lib/env";
import { formatIDR } from "@/lib/money";
import type { Order, OrderItem } from "@/lib/db/schema";

/**
 * Customer notifications.
 *
 * WhatsApp first — in Indonesia it is read, email often is not — with email as
 * a fallback so a failed WhatsApp send is not silent.
 *
 * Everything here is best-effort: a notification that fails must never roll
 * back a payment or block a webhook response. Failures are logged, not thrown.
 */

/* -------------------------------------------------------------------------- */
/* Transport                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Send a WhatsApp message via Fonnte.
 *
 * Kept behind this one function on purpose: swapping to Meta's official Cloud
 * API later means rewriting this body and nothing else.
 */
export async function sendWhatsApp(
  to: string,
  message: string,
): Promise<boolean> {
  const token = optionalEnv("FONNTE_TOKEN");
  if (!token) {
    console.warn("FONNTE_TOKEN not set — skipping WhatsApp to", to);
    return false;
  }

  try {
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: to, message, countryCode: "62" }),
    });

    if (!response.ok) {
      console.error(`Fonnte ${response.status}: ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("WhatsApp send failed", error);
    return false;
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<boolean> {
  const apiKey = optionalEnv("RESEND_API_KEY");
  const from = optionalEnv("EMAIL_FROM");
  if (!apiKey || !from) {
    console.warn("RESEND_API_KEY/EMAIL_FROM not set — skipping email to", to);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });

    if (!response.ok) {
      console.error(`Resend ${response.status}: ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email send failed", error);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                    */
/* -------------------------------------------------------------------------- */

type OrderForNotice = Pick<
  Order,
  | "orderNumber"
  | "email"
  | "phone"
  | "grandTotal"
  | "courier"
  | "courierService"
  | "trackingNumber"
> & { items?: Pick<OrderItem, "titleSnapshot" | "sizeSnapshot" | "qty">[] };

function orderUrl(orderNumber: string): string {
  return `${siteUrl()}/orders/${orderNumber}`;
}

function itemLines(order: OrderForNotice): string {
  if (!order.items?.length) return "";
  return (
    order.items
      .map((item) => `• ${item.titleSnapshot} (${item.sizeSnapshot}) ×${item.qty}`)
      .join("\n") + "\n\n"
  );
}

export async function notifyOrderPlaced(order: OrderForNotice): Promise<void> {
  const message =
    `Hi! Your Lorechester order ${order.orderNumber} is reserved.\n\n` +
    itemLines(order) +
    `Total: ${formatIDR(order.grandTotal)}\n\n` +
    `We'll confirm as soon as your payment lands. Track it here:\n${orderUrl(order.orderNumber)}`;

  await Promise.allSettled([
    sendWhatsApp(order.phone, message),
    sendEmail(order.email, `Order ${order.orderNumber} received`, message),
  ]);
}

export async function notifyPaymentReceived(
  order: OrderForNotice,
): Promise<void> {
  const message =
    `Payment received for ${order.orderNumber} — thank you.\n\n` +
    itemLines(order) +
    `Paid: ${formatIDR(order.grandTotal)}\n\n` +
    `We pack and ship within 1–2 working days and will send your tracking number here.\n${orderUrl(order.orderNumber)}`;

  await Promise.allSettled([
    sendWhatsApp(order.phone, message),
    sendEmail(order.email, `Payment confirmed — ${order.orderNumber}`, message),
  ]);
}

export async function notifyShipped(order: OrderForNotice): Promise<void> {
  const message =
    `Your Lorechester order ${order.orderNumber} is on its way.\n\n` +
    `Courier: ${order.courier ?? "—"} ${order.courierService ?? ""}\n` +
    `Tracking: ${order.trackingNumber ?? "—"}\n\n` +
    `Track it here:\n${orderUrl(order.orderNumber)}`;

  await Promise.allSettled([
    sendWhatsApp(order.phone, message),
    sendEmail(order.email, `Shipped — ${order.orderNumber}`, message),
  ]);
}

/** Ping the shop owner. Used for new paid orders and oversell warnings. */
export async function notifyOwner(message: string): Promise<void> {
  const owner = optionalEnv("OWNER_WHATSAPP");
  if (!owner) return;
  await sendWhatsApp(owner, message);
}
