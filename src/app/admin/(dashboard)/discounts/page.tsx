import { desc } from "drizzle-orm";
import Link from "next/link";

import { Badge, Button, EmptyState, PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { discounts } from "@/lib/db/schema";
import { formatIDR } from "@/lib/money";
import { DeleteDiscountButton } from "./delete-button";

export default async function DiscountsPage({
  searchParams,
}: PageProps<"/admin/discounts">) {
  const { saved } = await searchParams;
  const rows = await db
    .select()
    .from(discounts)
    .orderBy(desc(discounts.createdAt));

  const now = new Date();

  return (
    <>
      <PageHeader
        title="Discounts"
        description="Codes customers can enter at checkout."
        action={
          <Link href="/admin/discounts/new">
            <Button>New code</Button>
          </Link>
        }
      />

      {saved && (
        <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Discount saved.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No discount codes"
          description="Create a code for a launch, a restock, or a micro-influencer."
          action={
            <Link href="/admin/discounts/new">
              <Button>New code</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-paper-pure">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="meta px-4 py-3 text-muted">Code</th>
                <th className="meta px-4 py-3 text-muted">Discount</th>
                <th className="meta px-4 py-3 text-muted">Minimum</th>
                <th className="meta px-4 py-3 text-muted">Used</th>
                <th className="meta px-4 py-3 text-muted">Window</th>
                <th className="meta px-4 py-3 text-right text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((discount) => {
                const expired = discount.endsAt != null && discount.endsAt <= now;
                const notStarted =
                  discount.startsAt != null && discount.startsAt > now;
                const exhausted =
                  discount.usageLimit != null &&
                  discount.usedCount >= discount.usageLimit;

                const live =
                  discount.active && !expired && !notStarted && !exhausted;

                return (
                  <tr key={discount.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/discounts/${discount.id}`}
                        className="font-mono font-medium hover:underline"
                      >
                        {discount.code}
                      </Link>
                      <span className="ml-2">
                        {live ? (
                          <Badge tone="positive">Live</Badge>
                        ) : exhausted ? (
                          <Badge tone="danger">Used up</Badge>
                        ) : expired ? (
                          <Badge tone="neutral">Expired</Badge>
                        ) : notStarted ? (
                          <Badge tone="warning">Scheduled</Badge>
                        ) : (
                          <Badge tone="neutral">Off</Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {discount.type === "percent"
                        ? `${discount.value}%`
                        : formatIDR(discount.value)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {discount.minSubtotal > 0
                        ? formatIDR(discount.minSubtotal)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {discount.usedCount}
                      {discount.usageLimit != null && ` / ${discount.usageLimit}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {discount.startsAt || discount.endsAt
                        ? `${discount.startsAt?.toLocaleDateString("en-GB") ?? "—"} → ${discount.endsAt?.toLocaleDateString("en-GB") ?? "—"}`
                        : "Always"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/discounts/${discount.id}`}>
                          <Button variant="secondary" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <DeleteDiscountButton
                          id={discount.id}
                          code={discount.code}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
