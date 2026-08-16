import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";

import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, variants, waitlist } from "@/lib/db/schema";
import { NotifyButton } from "./notify-button";

export default async function WaitlistPage() {
  await requireAdmin();

  // Grouped by product so the "back in stock" blast has an obvious target.
  const groups = await db
    .select({
      productId: waitlist.productId,
      title: sql<string>`coalesce(${products.title}, 'General drop list')`,
      slug: products.slug,
      total: sql<number>`count(*)::int`,
      waiting: sql<number>`count(*) filter (where ${waitlist.notifiedAt} is null)::int`,
      stock: sql<number>`coalesce((
        select sum(v.stock)::int from ${variants} v where v.product_id = ${waitlist.productId}
      ), 0)`,
    })
    .from(waitlist)
    .leftJoin(products, eq(waitlist.productId, products.id))
    .groupBy(waitlist.productId, products.title, products.slug)
    .orderBy(desc(sql`count(*)`));

  const recent = await db
    .select({
      id: waitlist.id,
      email: waitlist.email,
      phone: waitlist.phone,
      createdAt: waitlist.createdAt,
      notifiedAt: waitlist.notifiedAt,
      title: sql<string>`coalesce(${products.title}, 'General drop list')`,
      size: variants.size,
    })
    .from(waitlist)
    .leftJoin(products, eq(waitlist.productId, products.id))
    .leftJoin(variants, eq(waitlist.variantId, variants.id))
    .orderBy(desc(waitlist.createdAt))
    .limit(50);

  const totalWaiting = groups.reduce((sum, group) => sum + group.waiting, 0);

  return (
    <>
      <PageHeader
        title="Waitlist"
        description={`${totalWaiting} ${totalWaiting === 1 ? "person is" : "people are"} waiting to hear from you`}
        action={
          groups.length > 0 ? (
            <a href="/admin/waitlist/export" className="meta text-muted hover:text-ink">
              Export CSV ↓
            </a>
          ) : null
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          title="No signups yet"
          description="A 'notify me' form appears on every sold-out size, and there's a drop-list block on the homepage."
        />
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold">By product</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-paper-pure">
              {groups.map((group) => (
                <li
                  key={group.productId ?? "general"}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    {group.slug ? (
                      <Link
                        href={`/product/${group.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-medium hover:underline"
                      >
                        {group.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{group.title}</span>
                    )}
                    <p className="text-xs text-muted">
                      {group.total} signup{group.total === 1 ? "" : "s"} ·{" "}
                      {group.waiting} not yet told
                      {group.productId != null && ` · ${group.stock} in stock`}
                    </p>
                  </div>

                  {group.waiting > 0 ? (
                    <Badge tone="warning">{group.waiting} waiting</Badge>
                  ) : (
                    <Badge tone="positive">All notified</Badge>
                  )}

                  {group.productId && group.waiting > 0 && (
                    <NotifyButton
                      productId={group.productId}
                      count={group.waiting}
                      hasStock={group.stock > 0}
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold">Recent signups</h2>
            <div className="overflow-x-auto rounded-lg border border-line bg-paper-pure">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="meta px-4 py-3 text-muted">Email</th>
                    <th className="meta px-4 py-3 text-muted">WhatsApp</th>
                    <th className="meta px-4 py-3 text-muted">Wants</th>
                    <th className="meta px-4 py-3 text-muted">Signed up</th>
                    <th className="meta px-4 py-3 text-muted">Told</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5">{row.email}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted">
                        {row.phone ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.title}
                        {row.size && (
                          <span className="meta ml-2 text-muted">{row.size}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted">
                        {row.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {row.notifiedAt ? (
                          <span className="text-emerald-700">✓</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
