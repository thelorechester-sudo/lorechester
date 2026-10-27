import { eq, sql } from "drizzle-orm";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { signOut } from "./actions";
import { AdminMobileMenu, AdminSidebar } from "./nav";

/*
 * Never prerender or cache the back office: every page is per-request,
 * per-admin data. Without this, a page whose only dynamic API is the auth
 * check becomes statically prerenderable the moment that check short-circuits
 * (as it does in demo mode), and `next build` tries to query the database.
 */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/admin">) {
  // The authorization boundary. proxy.ts only redirects browsers.
  const user = await requireAdmin();

  // Paid and not yet packed: the one number the owner acts on every day.
  const [{ toPack }] = await db
    .select({ toPack: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.status, "paid"));

  const footerLinkClass =
    "flex h-12 w-full items-center rounded-md px-3 text-sm text-ink hover:bg-line-soft";

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper-pure/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <AdminMobileMenu
            toPack={toPack}
            footer={
              <>
                <Link
                  href="/"
                  className={footerLinkClass}
                  target="_blank"
                  rel="noreferrer"
                >
                  View store ↗
                </Link>
                <form action={signOut}>
                  <button type="submit" className={footerLinkClass}>
                    Sign out
                  </button>
                </form>
                <p className="px-3 pt-2 text-xs text-muted">{user.email}</p>
              </>
            }
          />

          <Link href="/admin" className="text-sm font-semibold tracking-tight">
            Lorechester
            <span className="meta ml-2 text-muted">Admin</span>
          </Link>

          <div className="ml-auto hidden items-center gap-5 lg:flex">
            <Link
              href="/"
              className="meta text-muted hover:text-ink"
              target="_blank"
              rel="noreferrer"
            >
              View store ↗
            </Link>
            <span className="text-xs text-muted">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="meta text-muted hover:text-accent">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-10 px-4 py-8 sm:px-6 lg:py-10">
        <AdminSidebar toPack={toPack} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
