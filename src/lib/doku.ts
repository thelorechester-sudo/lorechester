import "server-only";

import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { optionalEnv, requireEnv, siteUrl } from "@/lib/env";

/**
 * DOKU Checkout — a DOKU-hosted payment page (VA, e-wallet, QRIS, card…) that
 * the customer is redirected to, then bounced back to `callback_url` once
 * they're done. Unlike Midtrans Snap this is a plain server-to-server API
 * with no client-side script: `createDokuPayment` hands back a URL, and the
 * browser just navigates there.
 *
 * Docs: https://developers.doku.com/accept-payments/doku-checkout
 */

export function isProduction(): boolean {
  return process.env.DOKU_IS_PRODUCTION === "true";
}

function apiBaseUrl(): string {
  return isProduction()
    ? "https://api.doku.com"
    : "https://api-sandbox.doku.com";
}

function clientId(): string {
  return requireEnv("DOKU_CLIENT_ID");
}

function secretKey(): string {
  return requireEnv("DOKU_SECRET_KEY");
}

/** True once both DOKU keys are set — the "is checkout configured" gate. */
export function isConfigured(): boolean {
  return Boolean(optionalEnv("DOKU_CLIENT_ID") && optionalEnv("DOKU_SECRET_KEY"));
}

/* -------------------------------------------------------------------------- */
/* Request signing                                                            */
/* -------------------------------------------------------------------------- */

/**
 * DOKU's signature scheme, shared by every non-SNAP endpoint and — per DOKU's
 * own sample code comment ("For HTTP Notification, use merchant path here")
 * — by inbound webhook notifications too, just with the merchant's own path
 * as Request-Target instead of DOKU's.
 *
 * Component string, one "Key:value" per line joined with "\n" (no trailing
 * newline), HMAC-SHA256'd with the secret key, base64, prefixed "HMACSHA256=".
 */
function buildSignature(args: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  digest?: string;
  secret: string;
}): string {
  const lines = [
    `Client-Id:${args.clientId}`,
    `Request-Id:${args.requestId}`,
    `Request-Timestamp:${args.requestTimestamp}`,
    `Request-Target:${args.requestTarget}`,
  ];
  // Omitted for bodyless requests (GET/DELETE) — every call this app makes has
  // a body, but the format follows DOKU's own sample code either way.
  if (args.digest) lines.push(`Digest:${args.digest}`);

  const hmac = createHmac("sha256", args.secret)
    .update(lines.join("\n"))
    .digest("base64");

  return `HMACSHA256=${hmac}`;
}

/** SHA-256 of the exact request body, base64 — the "Digest" signature component. */
function digestOf(rawBody: string): string {
  return createHash("sha256").update(rawBody, "utf-8").digest("base64");
}

/* -------------------------------------------------------------------------- */
/* Create payment                                                             */
/* -------------------------------------------------------------------------- */

export type DokuLineItem = {
  id: string;
  name: string;
  /** Integer rupiah. May be negative, which is how a discount is expressed. */
  price: number;
  quantity: number;
};

export type CreateDokuPaymentArgs = {
  invoiceNumber: string;
  /** Must equal the sum of line item prices × quantities. */
  amount: number;
  lineItems: DokuLineItem[];
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  /** Minutes until the payment link expires. */
  expiryMinutes?: number;
};

export type DokuPayment = { paymentUrl: string; tokenId: string };

export async function createDokuPayment(
  args: CreateDokuPaymentArgs,
): Promise<DokuPayment> {
  const itemsTotal = args.lineItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Fail here rather than let DOKU reject it with an opaque 400 — a mismatch
  // means our totals maths is wrong, which is worth surfacing loudly.
  if (itemsTotal !== args.amount) {
    throw new Error(
      `DOKU line item total (${itemsTotal}) does not match amount (${args.amount}).`,
    );
  }
  if (!Number.isInteger(args.amount) || args.amount <= 0) {
    throw new Error(`Invalid amount: ${args.amount}`);
  }

  const requestTarget = "/checkout/v1/payment";
  const orderUrl = `${siteUrl()}/orders/${args.invoiceNumber}`;
  const body = JSON.stringify({
    order: {
      amount: args.amount,
      invoice_number: args.invoiceNumber,
      currency: "IDR",
      // "Back to Merchant" button, shown before the customer has paid.
      callback_url: orderUrl,
      // Shown once the payment attempt resolves (success, pending, failed).
      // auto_redirect sends them straight back instead of waiting for a tap.
      callback_url_result: `${orderUrl}?paid=1`,
      auto_redirect: true,
      line_items: args.lineItems.map((item) => ({
        id: item.id,
        name: item.name.slice(0, 100),
        price: item.price,
        quantity: item.quantity,
      })),
    },
    payment: {
      payment_due_date: args.expiryMinutes ?? 24 * 60,
    },
    customer: {
      name: args.customer.name.slice(0, 100),
      email: args.customer.email,
      phone: args.customer.phone,
    },
  });

  const requestId = randomUUID();
  const requestTimestamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const digest = digestOf(body);
  const signature = buildSignature({
    clientId: clientId(),
    requestId,
    requestTimestamp,
    requestTarget,
    digest,
    secret: secretKey(),
  });

  const response = await fetch(`${apiBaseUrl()}${requestTarget}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Client-Id": clientId(),
      "Request-Id": requestId,
      "Request-Timestamp": requestTimestamp,
      Signature: signature,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DOKU Checkout error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    response: { payment: { url: string; token_id: string } };
  };

  return {
    paymentUrl: data.response.payment.url,
    tokenId: data.response.payment.token_id,
  };
}

/* -------------------------------------------------------------------------- */
/* Webhook verification                                                       */
/* -------------------------------------------------------------------------- */

export type DokuWebhookHeaders = {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  signature: string;
};

/**
 * Verify a notification came from DOKU.
 *
 * Same HMAC scheme as an outbound request (see buildSignature above), with
 * our own webhook path as Request-Target — that is exactly what DOKU signed
 * with when it sent this notification, per DOKU's own sample code. The
 * Digest is recomputed from the raw bytes we received, never trusted from a
 * header, so a tampered body always fails.
 *
 * Without this check, anyone who can reach the endpoint can mark any order
 * paid. Never skip it, and never trust the body before it passes.
 */
export function verifyWebhookSignature(
  headers: DokuWebhookHeaders,
  rawBody: string,
  requestTarget: string,
  secret = secretKey(),
): boolean {
  if (!headers.signature) return false;

  const expected = buildSignature({
    clientId: headers.clientId,
    requestId: headers.requestId,
    requestTimestamp: headers.requestTimestamp,
    requestTarget,
    digest: digestOf(rawBody),
    secret,
  });

  const a = Buffer.from(expected);
  const b = Buffer.from(headers.signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PaymentOutcome = "paid" | "pending" | "failed" | "expired";

/** Map DOKU's transaction status onto our order status. */
export function resolveOutcome(status: string): PaymentOutcome {
  switch (status) {
    case "SUCCESS":
      return "paid";
    case "PENDING":
      return "pending";
    case "EXPIRED":
      return "expired";
    case "FAILED":
      return "failed";
    default:
      return "pending";
  }
}
