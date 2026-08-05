import { PageHeader } from "@/components/admin/ui";
import { ArticleForm, EMPTY_ARTICLE } from "../article-form";

export default function NewArticlePage() {
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
