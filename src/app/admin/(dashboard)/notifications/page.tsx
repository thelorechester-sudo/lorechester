import { eq, sql } from "drizzle-orm";

import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { isPushConfigured } from "@/lib/push";
import { PushToggle } from "./push-toggle";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const user = await requireAdmin();

  const [{ devices }] = await db
    .select({ devices: sql<number>`count(*)::int` })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, user.id));

  return (
    <>
      <PageHeader
        title="Order alerts"
        description="Get a notification on your phone the moment a customer pays."
      />

      {!isPushConfigured() ? (
        <p className="rounded-md border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
          Alerts are not set up on this server yet: NEXT_PUBLIC_VAPID_PUBLIC_KEY
          and VAPID_PRIVATE_KEY are missing.
        </p>
      ) : (
        <div className="grid max-w-3xl gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <PushToggle
              publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!}
              devicesOnServer={devices}
            />
          </div>

          <section aria-labelledby="ios-heading" className="space-y-3 text-sm">
            <h2 id="ios-heading" className="font-semibold">
              On an iPhone
            </h2>
            <p className="text-muted">
              iPhones only allow alerts from apps on the Home Screen (iOS 16.4
              or newer). Do this once:
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-muted">
              <li>Open this admin in <strong className="text-ink">Safari</strong> and sign in.</li>
              <li>Tap the <strong className="text-ink">Share</strong> button, then <strong className="text-ink">Add to Home Screen</strong>.</li>
              <li>Open <strong className="text-ink">LC Admin</strong> from your Home Screen.</li>
              <li>Come back to this page there and tap <strong className="text-ink">Turn on order alerts</strong>.</li>
            </ol>
            <p className="text-xs text-muted">
              Each phone or computer is switched on separately. Alerts stop
              if you delete the Home Screen app or turn off notifications for it
              in iOS Settings.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
