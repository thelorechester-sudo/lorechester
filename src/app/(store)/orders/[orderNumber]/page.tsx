import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, type OrderStatus } from "@/lib/db/schema";
import { clientKey, snapScriptUrl } from "@/lib/midtrans";
import { formatIDR } from "@/lib/money";
import { PayNowButton } from "./pay-now";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<OrderStatus, { label: string; detail: string }> = {
  pending: {
    label: "Awaiting payment",
    detail:
      "We're holding this order until your payment clears. It expires in 24 hours.",
  },
  paid: {
    label: "Paid",
    detail: "Payment confirmed. We pack and ship within 1–2 working days.",
  },
  packed: {
    label: "Packed",
    detail: "Your parcel is packed and waiting for courier pickup.",
  },
  shipped: {
    label: "Shipped",
    detail: "On its way. Use the tracking number below to follow it.",
  },
  delivered: { label: "Delivered", detail: "Delivered. Thanks for the order." },
  cancelled: { label: "Cancelled", detail: "This order was cancelled." },
  expired: {
    label: "Expired",
    detail: "The payment window closed. Place a new order if you still want it.",
  },
};

/** j***@gmail.com — enough to recognise, not enough to harvest. */
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "•••";
  return `${name.slice(0, 1)}${"•".repeat(Math.max(2, name.length - 1))}@${domain}`;
}

function maskPhone(phone: string): string {
  return `${phone.slice(0, 4)}${"•".repeat(Math.max(2, phone.length - 7))}${phone.slice(-3)}`;
}

export default async function OrderPage({
  params,
  searchParams,
}: PageProps<"/orders/[orderNumber]">) {
  const [{ orderNumber }, query] = await Promise.all([params, searchParams]);

  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, orderNumber.toUpperCase()),
    with: { items: true },
  });

  if (!order) notFound();

  /*
   * The order number is a high-entropy bearer token, which is what lets the
   * Midtrans redirect and the WhatsApp link work without a login. Personal
   * details are still masked unless the viewer is provably the customer.
   */
  const user = await getCurrentUser();
  const isOwner =
    user != null &&
    (user.id === order.customerId ||
      user.email.toLowerCase() === order.email ||
      user.profile?.role === "admin");

  const status = STATUS_COPY[order.status];
  const address = order.shippingAddress;
  const key = clientKey();
  const canRetryPayment = order.status === "pending" && Boolean(order.snapToken);

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
      {canRetryPayment && key && (
        <Script
          src={snapScriptUrl()}
          data-client-key={key}
          strategy="afterInteractive"
        />
      )}

      {query.paid && order.status === "pending" && (
        <p className="mb-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Thanks — we&apos;ve received your payment and are waiting for the bank
          to confirm it. This page updates automatically once it clears; you
          don&apos;t need to pay again.
        </p>
      )}

      <p className="meta text-muted">Order</p>
      <h1 className="mt-1 tabular-nums text-3xl tracking-tight">
        {order.orderNumber}
      </h1>

      <div className="mt-6 border border-line bg-paper-pure p-5">
        <p className="text-lg font-medium">{status.label}</p>
        <p className="mt-1 text-sm text-muted">{status.detail}</p>

        {canRetryPayment && <PayNowButton token={order.snapToken!} />}

        {order.trackingNumber && (
          <p className="mt-4 border-t border-line pt-4 text-sm">
            <span className="meta text-muted">Tracking</span>
            <br />
            <span className="tabular-nums">{order.trackingNumber}</span>
            <span className="ml-2 text-muted">
              via {order.courier} {order.courierService}
            </span>
          </p>
        )}
      </div>

      <section className="mt-8">
        <h2 className="meta border-b border-line pb-2 text-muted">Items</h2>
        <ul className="divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-4">
              <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden bg-paper">
                {item.imageSnapshot && (
                  <Image
                    src={item.imageSnapshot}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.titleSnapshot}</p>
                <p className="meta mt-1 text-muted">
                  {item.sizeSnapshot} · ×{item.qty}
                </p>
              </div>
              <span className="tabular-nums text-sm">
                {formatIDR(item.priceSnapshot * item.qty)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatIDR(order.subtotal)}</dd>
          </div>
          {order.discountTotal > 0 && (
            <div className="flex justify-between text-accent">
              <dt>Discount {order.discountCode && `(${order.discountCode})`}</dt>
              <dd className="tabular-nums">−{formatIDR(order.discountTotal)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">
              Shipping{order.courier ? ` — ${order.courier}` : ""}
            </dt>
            <dd className="tabular-nums">
              {order.shippingTotal === 0 ? "Free" : formatIDR(order.shippingTotal)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base">
            <dt className="font-medium">Total</dt>
            <dd className="tabular-nums">{formatIDR(order.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="meta border-b border-line pb-2 text-muted">Delivering to</h2>
        <address className="mt-3 text-sm not-italic leading-relaxed text-muted">
          <span className="text-ink">{address.recipientName}</span>
          <br />
          {isOwner ? (
            <>
              {address.line1}
              <br />
              {address.areaLabel} {address.postalCode}
              <br />
              {order.email} · {address.phone}
            </>
          ) : (
            <>
              {address.areaLabel} {address.postalCode}
              <br />
              {maskEmail(order.email)} · {maskPhone(order.phone)}
              <br />
              <Link href="/orders/lookup" className="text-ink underline">
                Sign in or look up this order
              </Link>{" "}
              to see the full address.
            </>
          )}
        </address>
      </section>

      <p className="mt-10 text-xs text-muted">
        Placed{" "}
        {order.createdAt.toLocaleString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
