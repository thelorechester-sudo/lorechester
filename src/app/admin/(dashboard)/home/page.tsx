import { eq } from "drizzle-orm";

import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { HOME_KEY, homeSettingsSchema } from "@/lib/settings";
import { HomeForm, type HomeFormValues } from "./home-form";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdmin();

  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, HOME_KEY))
    .limit(1);

  /*
   * The form is seeded with what is *stored*, not with the resolved values —
   * so a field the admin never set shows as empty with the default as its
   * placeholder, rather than looking like they typed the default in.
   */
  const parsed = row ? homeSettingsSchema.safeParse(row.value) : null;
  const initial: HomeFormValues = parsed?.success
    ? parsed.data
    : { marquee: [] };

  return (
    <>
      <PageHeader
        title="Home page"
        description="Copy and images on the storefront home page. Leave a field empty to use the built-in wording."
      />
      <HomeForm initial={initial} />
    </>
  );
}
