import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { discounts } from "@/lib/db/schema";
import { DiscountForm, type DiscountFormValues } from "../discount-form";

function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default async function EditDiscountPage({
  params,
}: PageProps<"/admin/discounts/[id]">) {
  await requireAdmin();

  const { id } = await params;

  const [discount] = await db
    .select()
    .from(discounts)
    .where(eq(discounts.id, id))
    .limit(1);

  if (!discount) notFound();

  const initial: DiscountFormValues = {
    id: discount.id,
    code: discount.code,
    type: discount.type,
    value: discount.value,
    minSubtotal: discount.minSubtotal,
    startsAt: discount.startsAt ? toLocalInputValue(discount.startsAt) : "",
    endsAt: discount.endsAt ? toLocalInputValue(discount.endsAt) : "",
    usageLimit: discount.usageLimit,
    active: discount.active,
  };

  return (
    <>
      <PageHeader
        title={discount.code}
        description={`Redeemed ${discount.usedCount} time${discount.usedCount === 1 ? "" : "s"}`}
      />
      <DiscountForm initial={initial} />
    </>
  );
}
