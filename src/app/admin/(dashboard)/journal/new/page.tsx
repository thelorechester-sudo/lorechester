import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { ArticleForm, EMPTY_ARTICLE } from "../article-form";

export default async function NewArticlePage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="New article"
        description="Saved as a draft until you switch the status to Published."
      />
      <ArticleForm initial={EMPTY_ARTICLE} />
    </>
  );
}
