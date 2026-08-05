"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, waitlist } from "@/lib/db/schema";
import { siteUrl } from "@/lib/env";
import { sendEmail, sendWhatsApp } from "@/lib/notify";

export type BlastState = { ok: boolean; message?: string; error?: string };

/**
 * Tell everyone waiting on a product that it is back.
 *
 * Only signups that have never been notified are contacted, and each one is
 * stamped as it goes out — so pressing the button twice does not message the
 * same person twice.
 */
export async function notifyBackInStock(
  _prev: BlastState,
  formData: FormData,
): Promise<BlastState> {
  await requireAdmin();

  const productId = String(formData.get("productId") ?? "");
  if (!productId) return { ok: false, error: "Missing product." };

  const [product] = await db
    .select({ title: products.title, slug: products.slug })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) return { ok: false, error: "Product not found." };

  const pending = await db
    .select()
    .from(waitlist)
    .where(and(eq(waitlist.productId, productId), isNull(waitlist.notifiedAt)));

  if (pending.length === 0) {
    return { ok: true, message: "Everyone on this list has already been told." };
  }

  const url = `${siteUrl()}/product/${product.slug}`;
  const message =
    `${product.title} is back in stock at Lorechester.\n\n` +
    `Runs are limited, so it won't last long:\n${url}\n\n` +
    `You're getting this because you asked to be told. Reply STOP to opt out.`;

  let sent = 0;
  for (const entry of pending) {
    const results = await Promise.allSettled([
      entry.phone ? sendWhatsApp(entry.phone, message) : Promise.resolve(false),
      sendEmail(entry.email, `${product.title} is back`, message),
    ]);

    const delivered = results.some(
      (result) => result.status === "fulfilled" && result.value === true,
    );

    // Stamp per-entry rather than in one bulk update: if the loop dies
    // halfway, the people already messaged are not messaged again.
    if (delivered) {
      await db
        .update(waitlist)
        .set({ notifiedAt: new Date() })
        .where(eq(waitlist.id, entry.id));
      sent += 1;
    }
  }

  revalidatePath("/admin/waitlist");

  return {
    ok: true,
    message:
      sent === pending.length
        ? `Messaged ${sent} ${sent === 1 ? "person" : "people"}.`
        : `Messaged ${sent} of ${pending.length}. The rest failed — check that FONNTE_TOKEN and RESEND_API_KEY are set.`,
  };
}

/** CSV of every signup, for importing into a mailing tool. */
export async function exportWaitlist(): Promise<string> {
  await requireAdmin();

  const rows = await db
    .select({
      email: waitlist.email,
      phone: waitlist.phone,
      product: sql<string>`coalesce(${products.title}, 'General drop list')`,
      createdAt: waitlist.createdAt,
      notifiedAt: waitlist.notifiedAt,
    })
    .from(waitlist)
    .leftJoin(products, eq(waitlist.productId, products.id));

  const header = "email,phone,product,signed_up,notified";
  const body = rows
    .map((row) =>
      [
        row.email,
        row.phone ?? "",
        `"${row.product.replace(/"/g, '""')}"`,
        row.createdAt.toISOString(),
        row.notifiedAt?.toISOString() ?? "",
      ].join(","),
    )
    .join("\n");

  return `${header}\n${body}`;
}
