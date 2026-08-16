import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";

import { Badge, EmptyState, PageHeader, cx } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, type OrderStatus } from "@/lib/db/schema";
import { formatIDR } from "@/lib/money";

const STATUS_TONE: Record<OrderStatus, "positive" | "warning" | "danger" | "neutral"> = {
  pending: "warning",
  paid: "positive",
  packed: "positive",
  shipped: "positive",
  delivered: "neutral",
  cancelled: "danger",
  expired: "neutral",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "paid", label: "To pack" },
  { key: "packed", label: "To ship" },
  { key: "shipped", label: "In transit" },
  { key: "pending", label: "Unpaid" },
] as const;

export default async function OrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  await requireAdmin();

  const { status } = await searchParams;
  const active = typeof status === "string" ? status : "all";

  const rows = await db.query.orders.findMany({
    with: { items: true },
    where:
      active !== "all"
        ? eq(orders.status, active as OrderStatus)
        : undefined,
    orderBy: desc(orders.createdAt),
    limit: 200,
  });

  const [revenue] = await db
    .select({
      paidCount: sql<number>`count(*) filter (where ${orders.status} <> 'pending' and ${orders.status} <> 'cancelled' and ${orders.status} <> 'expired')::int`,
      paidTotal: sql<number>`coalesce(sum(${orders.grandTotal}) filter (where ${orders.status} <> 'pending' and ${orders.status} <> 'cancelled' and ${orders.status} <> 'expired'), 0)::bigint`,
    })
    .from(orders);

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${revenue.paidCount} paid orders · ${formatIDR(Number(revenue.paidTotal))} lifetime revenue`}
      />

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Filter orders">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={filter.key === "all" ? "/admin/orders" : `/admin/orders?status=${filter.key}`}
            aria-current={active === filter.key ? "page" : undefined}
            className={cx(
              "meta border px-3 py-1.5 transition-colors",
              active === filter.key
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink hover:text-ink",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          title="No orders here"
          description="Orders appear as soon as a customer reaches the payment step."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-paper-pure">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="meta px-4 py-3 text-muted">Order</th>
                <th className="meta px-4 py-3 text-muted">Customer</th>
                <th className="meta px-4 py-3 text-muted">Items</th>
                <th className="meta px-4 py-3 text-muted">Total</th>
                <th className="meta px-4 py-3 text-muted">Status</th>
                <th className="meta px-4 py-3 text-muted">Placed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr key={order.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-xs hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="max-w-48 truncate px-4 py-3">
                    {order.shippingAddress.recipientName}
                    <span className="block truncate text-xs text-muted">
                      {order.email}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {order.items.reduce((sum, item) => sum + item.qty, 0)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatIDR(order.grandTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {order.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
