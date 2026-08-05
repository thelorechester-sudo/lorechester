import "server-only";

import { createHash } from "node:crypto";

import { optionalEnv, requireEnv, siteUrl } from "@/lib/env";

/**
 * Midtrans Snap.
 *
 * Written against the REST API directly rather than the `midtrans-client`
 * package: it is two endpoints, and the SDK ships no types.
 *
 * Docs: https://docs.midtrans.com/reference/backend-integration
 */

export function isProduction(): boolean {
  return process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
}

function snapBaseUrl(): string {
  return isProduction()
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";
}

function apiBaseUrl(): string {
  return isProduction()
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";
}

function authHeader(): string {
  // Basic auth: server key as the username, empty password.
  const serverKey = requireEnv("MIDTRANS_SERVER_KEY");
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

export type SnapItem = {
  id: string;
  name: string;
  /** Integer rupiah. May be negative, which is how a discount is expressed. */
  price: number;
  quantity: number;
};

export type CreateSnapArgs = {
  orderId: string;
  /** Must equal the sum of item prices × quantities, or Midtrans rejects it. */
  grossAmount: number;
  items: SnapItem[];
  customer: {
    firstName: string;
    email: string;
    phone: string;
  };
  /** Minutes until the payment link expires. */
  expiryMinutes?: number;
};

export type SnapTransaction = { token: string; redirectUrl: string };

export async function createSnapTransaction(
  args: CreateSnapArgs,
): Promise<SnapTransaction> {
  const itemsTotal = args.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Fail here rather than let Midtrans reject it with an opaque 400 — a
  // mismatch means our totals maths is wrong, which is worth surfacing loudly.
  if (itemsTotal !== args.grossAmount) {
    throw new Error(
      `Midtrans item total (${itemsTotal}) does not match gross amount (${args.grossAmount}).`,
    );
  }
  if (!Number.isInteger(args.grossAmount) || args.grossAmount <= 0) {
    throw new Error(`Invalid gross amount: ${args.grossAmount}`);
  }

  const response = await fetch(`${snapBaseUrl()}/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: args.orderId,
        gross_amount: args.grossAmount,
      },
      item_details: args.items.map((item) => ({
        id: item.id,
        name: item.name.slice(0, 50), // Midtrans truncates past 50 chars
        price: item.price,
        quantity: item.quantity,
      })),
      customer_details: {
        first_name: args.customer.firstName.slice(0, 50),
        email: args.customer.email,
        phone: args.customer.phone,
      },
      callbacks: {
        finish: `${siteUrl()}/orders/${args.orderId}`,
      },
      expiry: {
        unit: "minute",
        duration: args.expiryMinutes ?? 24 * 60,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Midtrans Snap error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    token: string;
    redirect_url: string;
  };

  return { token: data.token, redirectUrl: data.redirect_url };
}

/* -------------------------------------------------------------------------- */
/* Webhook verification                                                        */
/* -------------------------------------------------------------------------- */

export type MidtransNotification = {
  order_id: string;
  status_code: string;
  /** A decimal string such as "498000.00". Hash the string, never a number. */
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
  transaction_time?: string;
};

/**
 * Verify a webhook payload came from Midtrans.
 *
 * signature = SHA512(order_id + status_code + gross_amount + server_key)
 *
 * Without this check, anyone who can reach the endpoint can mark any order
 * paid. Never skip it, and never trust `transaction_status` before it passes.
 */
export function verifyNotificationSignature(
  notification: Pick<
    MidtransNotification,
    "order_id" | "status_code" | "gross_amount" | "signature_key"
  >,
  serverKey = requireEnv("MIDTRANS_SERVER_KEY"),
): boolean {
  const expected = createHash("sha512")
    .update(
      notification.order_id +
        notification.status_code +
        notification.gross_amount +
        serverKey,
    )
    .digest("hex");

  return timingSafeEqualHex(expected, notification.signature_key ?? "");
}

/** Constant-time comparison of two hex strings of equal expected length. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export type PaymentOutcome = "paid" | "pending" | "failed" | "expired";

/**
 * Map Midtrans transaction states onto our order status.
 *
 * `capture` is card-specific and only counts once fraud review accepts it —
 * treating a challenged capture as paid is how you ship goods on a chargeback.
 */
export function resolveOutcome(
  notification: Pick<
    MidtransNotification,
    "transaction_status" | "fraud_status"
  >,
): PaymentOutcome {
  const { transaction_status: status, fraud_status: fraud } = notification;

  switch (status) {
    case "capture":
      return fraud === "accept" ? "paid" : "pending";
    case "settlement":
      return "paid";
    case "pending":
      return "pending";
    case "expire":
      return "expired";
    case "deny":
    case "cancel":
    case "failure":
      return "failed";
    default:
      return "pending";
  }
}

/**
 * Ask Midtrans for the authoritative state of a transaction.
 *
 * Used to reconcile an order when the customer lands on the success page
 * before the webhook arrives — never used as a substitute for the webhook.
 */
export async function fetchTransactionStatus(
  orderId: string,
): Promise<MidtransNotification | null> {
  const response = await fetch(`${apiBaseUrl()}/${orderId}/status`, {
    headers: { Accept: "application/json", Authorization: authHeader() },
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as MidtransNotification;
}

export function clientKey(): string | undefined {
  return optionalEnv("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY");
}

/** URL of the Snap popup script, environment-matched. */
export function snapScriptUrl(): string {
  return isProduction()
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}
