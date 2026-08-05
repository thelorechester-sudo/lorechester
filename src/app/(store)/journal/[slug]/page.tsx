import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getArticleBySlug } from "@/lib/content";
import { siteUrl } from "@/lib/env";
import { Prose } from "@/lib/prose";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.excerpt || article.body.slice(0, 160),
    alternates: { canonical: `/journal/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt?.toISOString(),
      images: article.coverImage ? [article.coverImage] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: PageProps<"/journal/[slug]">) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: article.coverImage ? [article.coverImage] : undefined,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { "@type": "Organization", name: "Lorechester" },
    publisher: { "@type": "Organization", name: "Lorechester" },
    mainEntityOfPage: `${siteUrl()}/journal/${article.slug}`,
  };

  return (
    <article className="pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {article.coverImage && (
        <div className="relative aspect-[16/8] w-full overflow-hidden bg-paper">
          <Image
            src={article.coverImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="mx-auto max-w-2xl px-5 pt-12 sm:px-8">
        <Link href="/journal" className="meta text-muted hover:text-ink">
          ← Journal
        </Link>

        {article.publishedAt && (
          <time
            dateTime={article.publishedAt.toISOString()}
            className="meta mt-8 block text-muted"
          >
            {article.publishedAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
        )}

        <h1 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-5xl">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="mt-5 text-lg leading-relaxed text-ink/70">
            {article.excerpt}
          </p>
        )}

        <hr className="my-10 border-line" />

        <Prose body={article.body} />

        <hr className="mt-14 border-line" />
        <Link
          href="/shop"
          className="meta mt-8 inline-block border-b border-ink pb-1"
        >
          Shop the collection
        </Link>
      </div>
    </article>
  );
}
