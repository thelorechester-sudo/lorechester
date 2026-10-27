import { inArray } from "drizzle-orm";
import Link from "next/link";

import { Badge, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { PAGE_LABELS, PAGE_SLUGS, pageKey } from "@/lib/pages";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  await requireAdmin();

  const rows = await db
    .select({ key: settings.key, updatedAt: settings.updatedAt })
    .from(settings)
    .where(inArray(settings.key, PAGE_SLUGS.map(pageKey)));

  const edited = new Map(rows.map((row) => [row.key, row.updatedAt]));

  return (
    <>
      <PageHeader
        title="Pages"
        description="The text pages linked from the footer. Open one to change its wording."
      />

      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-paper-pure">
        {PAGE_SLUGS.map((slug) => {
          const label = PAGE_LABELS[slug];
          const updatedAt = edited.get(pageKey(slug));

          return (
            <li key={slug}>
              <Link
                href={`/admin/pages/${slug}`}
                className="flex items-center gap-4 px-4 py-4 hover:bg-line-soft"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{label.name}</p>
                  <p className="text-xs text-muted">{label.hint}</p>
                </div>
                {updatedAt ? (
                  <Badge tone="positive">
                    Edited {updatedAt.toLocaleDateString("en-GB")}
                  </Badge>
                ) : (
                  <Badge>Built-in text</Badge>
                )}
                <span aria-hidden className="text-muted">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
