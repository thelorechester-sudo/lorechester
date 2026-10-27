"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { sendAdminPush } from "@/lib/push";

export type PushActionResult = { ok: boolean; message?: string };

/** What `PushSubscription.toJSON()` returns in the browser. */
const subscriptionSchema = z.object({
  endpoint: z.url().max(2000).refine((value) => value.startsWith("https://"), "Push endpoints are https"),
  keys: z.object({
    p256dh: z.string().min(1).max(300),
    auth: z.string().min(1).max(100),
  }),
});

export async function savePushSubscription(
  input: unknown,
  userAgent: string,
): Promise<PushActionResult> {
  const user = await requireAdmin();

  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That device sent an invalid subscription." };

  const { endpoint, keys } = parsed.data;
  const values = {
    userId: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: userAgent.slice(0, 300),
  };

  // Re-subscribing from the same device updates its row (and owner) in place.
  await db
    .insert(pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });

  revalidatePath("/admin/notifications");
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<PushActionResult> {
  const user = await requireAdmin();

  // Scoped to the caller: one admin cannot switch off another's phone.
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, String(endpoint)),
        eq(pushSubscriptions.userId, user.id),
      ),
    );

  revalidatePath("/admin/notifications");
  return { ok: true };
}

export async function sendTestPush(): Promise<PushActionResult> {
  const user = await requireAdmin();

  const { sent } = await sendAdminPush(
    {
      title: "Order alerts are on",
      body: "This is a test. New paid orders will arrive like this.",
      url: "/admin/orders",
      tag: "test",
    },
    user.id,
  );

  return sent > 0
    ? { ok: true, message: "Sent. It should appear on your phone in a few seconds." }
    : { ok: false, message: "Nothing was sent. Turn alerts on for this device first." };
}
