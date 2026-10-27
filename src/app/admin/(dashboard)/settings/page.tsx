import { eq } from "drizzle-orm";

import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/config";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import {
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_NAV,
  SITE_KEY,
  siteSettingsSchema,
} from "@/lib/site";
import { SiteForm, type SiteFormValues } from "./site-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, SITE_KEY))
    .limit(1);

  const parsed = row ? siteSettingsSchema.safeParse(row.value) : null;
  const stored = parsed?.success ? parsed.data : null;

  /*
   * The menus are seeded with what is live (stored, else the built-in list)
   * so the owner edits the real thing rather than an empty box. Text fields
   * show the stored value only, with the default as placeholder.
   */
  const initial: SiteFormValues = {
    ...stored,
    nav: stored?.nav.length ? stored.nav : DEFAULT_NAV,
    footerColumns: stored?.footerColumns.length
      ? stored.footerColumns
      : DEFAULT_FOOTER_COLUMNS,
  };

  return (
    <>
      <PageHeader
        title="Site settings"
        description="The menu, footer, contact details and free-shipping offer used across the whole store."
      />
      <SiteForm initial={initial} envFreeShipping={FREE_SHIPPING_THRESHOLD} />
    </>
  );
}
