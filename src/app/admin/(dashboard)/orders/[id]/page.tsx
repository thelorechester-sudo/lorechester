import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatIDR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { FulfilPanel } from "./fulfil-panel";

export default async function AdminOrderPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true },
  });

  if (!order) notFound();

  const address = order.shippingAddress;
  const oversold = order.note?.includes("OVERSOLD");

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${order.createdAt.toLocaleString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`}
        action={
          <Link
            href={`/orders/${order.orderNumber}`}
            target="_blank"
            rel="noreferrer"
            className="meta text-muted hover:text-ink"
          >
            Customer view ↗
          </Link>
        }
      />

      {oversold && (
        <p className="mb-6 rounded-md border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
          <strong>Oversold.</strong> This order was paid for after stock ran
          out. Contact the customer before shipping. Details in the internal
          note below.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-paper-pure">
            <h2 className="meta border-b border-line px-5 py-3 text-muted">
              Items
            </h2>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 px-5 py-4">
                  <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden bg-paper">
                    {item.imageSnapshot && (
                      <Image
                        src={item.imageSnapshot}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.titleSnapshot}</p>
                    <p className="meta mt-1 text-muted">
                      Size {item.sizeSnapshot} · ×{item.qty}
                    </p>
                  </div>
                  <span className="font-mono text-sm">
                    {formatIDR(item.priceSnapshot * item.qty)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="space-y-2 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-mono">{formatIDR(order.subtotal)}</dd>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-accent">
                  <dt>Discount {order.discountCode && `(${order.discountCode})`}</dt>
                  <dd className="font-mono">−{formatIDR(order.discountTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd className="font-mono">{formatIDR(order.shippingTotal)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-medium">
                <dt>Total</dt>
                <dd className="font-mono">{formatIDR(order.grandTotal)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-line bg-paper-pure p-5">
            <h2 className="meta mb-3 text-muted">Ship to</h2>
            <address className="text-sm not-italic leading-relaxed">
              <strong>{address.recipientName}</strong>
              <br />
              {address.line1}
              <br />
              {address.areaLabel} {address.postalCode}
              <br />
              <span className="text-muted">
                {formatPhone(address.phone)} · {order.email}
              </span>
              {address.note && (
                <>
                  <br />
                  <span className="mt-2 block text-muted">
                    Note: {address.note}
                  </span>
                </>
              )}
            </address>
          </section>

          {order.note && (
            <section className="rounded-lg border border-line bg-paper-pure p-5">
              <h2 className="meta mb-2 text-muted">Internal note</h2>
              <p className="whitespace-pre-line text-sm text-muted">
                {order.note}
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-line bg-paper-pure p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="meta text-muted">Status</h2>
              <Badge
                tone={
                  order.status === "cancelled" || order.status === "expired"
                    ? "danger"
                    : order.status === "pending"
                      ? "warning"
                      : "positive"
                }
              >
                {order.status}
              </Badge>
            </div>

            <FulfilPanel
              orderId={order.id}
              status={order.status}
              trackingNumber={order.trackingNumber ?? ""}
              courier={`${order.courier ?? ""} ${order.courierService ?? ""}`.trim()}
            />
          </section>

          <section className="space-y-1.5 rounded-lg border border-line bg-paper-pure p-5 text-xs text-muted">
            <h2 className="meta mb-2 text-muted">Payment</h2>
            <p>Method: {order.paymentMethod ?? "—"}</p>
            <p>
              Paid:{" "}
              {order.paidAt
                ? order.paidAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
            <p className="break-all">
              Midtrans id: {order.midtransTransactionId ?? "—"}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
