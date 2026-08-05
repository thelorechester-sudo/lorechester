import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { signOut } from "./actions";
import { AdminNav } from "./nav";

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

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-paper-pure/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
          <Link href="/admin" className="text-sm font-semibold tracking-tight">
            Lorechester
            <span className="meta ml-2 text-muted">Admin</span>
          </Link>

          <AdminNav />

          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/"
              className="meta text-muted hover:text-ink"
              target="_blank"
              rel="noreferrer"
            >
              View store ↗
            </Link>
            <span className="hidden text-xs text-muted sm:block">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="meta text-muted hover:text-accent">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
