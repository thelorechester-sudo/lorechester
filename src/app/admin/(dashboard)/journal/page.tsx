import { desc } from "drizzle-orm";
import Link from "next/link";

import { Badge, Button, EmptyState, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { DeleteArticleButton } from "./delete-button";

export default async function JournalPage({
  searchParams,
}: PageProps<"/admin/journal">) {
  await requireAdmin();

  const { saved } = await searchParams;
  const rows = await db.select().from(articles).orderBy(desc(articles.createdAt));

  return (
    <>
      <PageHeader
        title="Journal"
        description="Long-form posts: shoots, process, drop notes."
        action={
          <Link href="/admin/journal/new">
            <Button>New article</Button>
          </Link>
        }
      />

      {saved && (
        <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Article saved.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing published yet"
          description="Journal posts give people a reason to come back between drops — and give Google something to index."
          action={
            <Link href="/admin/journal/new">
              <Button>New article</Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-paper-pure">
          {rows.map((article) => (
            <li key={article.id} className="flex items-center gap-4 px-4 py-3">
              <div
                className="h-14 w-20 shrink-0 rounded bg-paper bg-cover bg-center"
                style={
                  article.coverImage
                    ? { backgroundImage: `url(${article.coverImage})` }
                    : undefined
                }
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/journal/${article.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {article.title}
                </Link>
                <p className="truncate text-xs text-muted">
                  /journal/{article.slug}
                  {article.publishedAt &&
                    ` · ${article.publishedAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`}
                </p>
              </div>
              <Badge tone={article.status === "published" ? "positive" : "warning"}>
                {article.status}
              </Badge>
              <div className="flex items-center gap-2">
                <Link href={`/admin/journal/${article.id}`}>
                  <Button variant="secondary" size="sm">
                    Edit
                  </Button>
                </Link>
                <DeleteArticleButton id={article.id} title={article.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
