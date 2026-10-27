import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import {
  PAGE_DEFAULTS,
  PAGE_LABELS,
  isPageSlug,
  pageKey,
  pageSettingsSchema,
  resolvePage,
} from "@/lib/pages";
import { PageForm } from "../page-form";

export const dynamic = "force-dynamic";

export default async function AdminPageEditor({
  params,
}: PageProps<"/admin/pages/[slug]">) {
  await requireAdmin();

  const { slug } = await params;
  if (!isPageSlug(slug)) notFound();

  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, pageKey(slug)))
    .limit(1);

  const parsed = row ? pageSettingsSchema.safeParse(row.value) : null;
  // Seeded with what is live, so the owner edits the real text.
  const live = resolvePage(slug, parsed?.success ? parsed.data : {});

  return (
    <>
      <PageHeader
        title={PAGE_LABELS[slug].name}
        description={`Editing ${PAGE_LABELS[slug].path}`}
        action={
          <Link
            href={PAGE_LABELS[slug].path}
            target="_blank"
            rel="noreferrer"
            className="meta text-muted hover:text-ink"
          >
            View page ↗
          </Link>
        }
      />
      <PageForm slug={slug} initial={live} defaults={PAGE_DEFAULTS[slug]} />
    </>
  );
}
