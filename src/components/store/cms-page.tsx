import type { Metadata } from "next";

import { getPageContent, getSiteSettings } from "@/lib/content";
import { formatIDR } from "@/lib/money";
import { type PageSlug } from "@/lib/pages";
import { Prose } from "@/lib/prose";
import { fillTokens } from "@/lib/prose-parse";
import { pageTokens } from "@/lib/site";

/**
 * A store text page whose wording the admin can edit (see @/lib/pages). The
 * route files are one-liners over this so every page gets the same layout.
 */
export async function CmsPage({ slug }: { slug: PageSlug }) {
  const [page, site] = await Promise.all([
    getPageContent(slug),
    getSiteSettings(),
  ]);

  const body = fillTokens(page.body, pageTokens(site, formatIDR));

  return (
    <article className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <h1 className="text-headline font-semibold uppercase">{page.title}</h1>
      <div className="mt-10">
        <Prose body={body} size="sm" />
      </div>
    </article>
  );
}

export async function cmsMetadata(slug: PageSlug): Promise<Metadata> {
  const page = await getPageContent(slug);
  return { title: page.title, description: page.description };
}
