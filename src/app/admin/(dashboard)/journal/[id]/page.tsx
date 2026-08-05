import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { ArticleForm, type ArticleFormValues } from "../article-form";

export default async function EditArticlePage({
  params,
}: PageProps<"/admin/journal/[id]">) {
  const { id } = await params;

  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);

  if (!article) notFound();

  const initial: ArticleFormValues = {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    coverImage: article.coverImage,
    body: article.body,
    status: article.status,
  };

  return (
    <>
      <PageHeader
        title={article.title}
        description={`/journal/${article.slug}`}
        action={
          article.status === "published" ? (
            <Link
              href={`/journal/${article.slug}`}
              target="_blank"
              rel="noreferrer"
              className="meta text-muted hover:text-ink"
            >
              View on store ↗
            </Link>
          ) : null
        }
      />
      <ArticleForm initial={initial} />
    </>
  );
}
