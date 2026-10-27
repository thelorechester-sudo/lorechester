import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import webpush from "web-push";

import { db } from "@/lib/db";
import { profiles, pushSubscriptions } from "@/lib/db/schema";
import { isLocalDatabase, optionalEnv, siteUrl } from "@/lib/env";

/**
 * Order alerts for the admin's phone: Web Push to every device that turned
 * alerts on (an iPhone with the admin added to its Home Screen, a laptop…).
 *
 * Best-effort like the rest of @/lib/notify — a push that fails must never
 * fail a payment webhook, so nothing here throws.
 */

export type PushMessage = {
  title: string;
  body: string;
  /** Site-relative path opened when the notification is tapped. */
  url: string;
  /** Same tag replaces the previous notification instead of stacking. */
  tag?: string;
};

export function isPushConfigured(): boolean {
  return Boolean(
    optionalEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY") && optionalEnv("VAPID_PRIVATE_KEY"),
  );
}

export async function sendAdminPush(
  message: PushMessage,
  /** Limit to one admin's devices (used by the "send a test" button). */
  onlyUserId?: string,
): Promise<{ sent: number; removed: number }> {
  const publicKey = optionalEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const privateKey = optionalEnv("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) {
    console.warn("VAPID keys not set — skipping admin push");
    return { sent: 0, removed: 0 };
  }

  try {
    webpush.setVapidDetails(
      optionalEnv("VAPID_SUBJECT") ?? siteUrl(),
      publicKey,
      privateKey,
    );

    /*
     * Only devices whose owner is *currently* an admin. A subscription row
     * outlives a demotion, so the role is checked at send time rather than
     * trusted from when the device subscribed. The local demo has no profiles.
     */
    const rows = isLocalDatabase()
      ? await db
          .select()
          .from(pushSubscriptions)
          .where(onlyUserId ? eq(pushSubscriptions.userId, onlyUserId) : undefined)
      : (
          await db
            .select({ subscription: pushSubscriptions })
            .from(pushSubscriptions)
            .innerJoin(profiles, eq(profiles.userId, pushSubscriptions.userId))
            .where(
              and(
                eq(profiles.role, "admin"),
                onlyUserId ? eq(pushSubscriptions.userId, onlyUserId) : undefined,
              ),
            )
        ).map((row) => row.subscription);

    const payload = JSON.stringify(message);
    const gone: string[] = [];
    let sent = 0;

    await Promise.all(
      rows.map(async (row) => {
        try {
          await webpush.sendNotification(
            { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            payload,
            { TTL: 60 * 60 * 24, urgency: "high" },
          );
          sent += 1;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          // 404 / 410: the device uninstalled the app or revoked permission.
          if (status === 404 || status === 410) gone.push(row.endpoint);
          else console.error("Push send failed", status ?? error);
        }
      }),
    );

    if (gone.length) {
      await db
        .delete(pushSubscriptions)
        .where(inArray(pushSubscriptions.endpoint, gone));
    }

    return { sent, removed: gone.length };
  } catch (error) {
    console.error("Admin push failed", error);
    return { sent: 0, removed: 0 };
  }
}
