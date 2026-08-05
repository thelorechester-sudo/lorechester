import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getPublishedArticles } from "@/lib/content";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Shoots, process notes and drop stories from the Lorechester studio.",
};

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const posts = await getPublishedArticles();

  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
      <h1 className="text-headline font-black uppercase">Journal</h1>

      {posts.length === 0 ? (
        <p className="mt-12 border border-dashed border-line px-6 py-20 text-center text-sm text-muted">
          Nothing published yet. Check back soon.
        </p>
      ) : (
        <ul className="mt-12 grid gap-12 sm:grid-cols-2">
          {posts.map((post, index) => (
            <li key={post.id} className={index === 0 ? "sm:col-span-2" : ""}>
              <Link href={`/journal/${post.slug}`} className="group block">
                {post.coverImage && (
                  <div
                    className={
                      "relative overflow-hidden bg-paper " +
                      (index === 0 ? "aspect-[16/7]" : "aspect-[3/2]")
                    }
                  >
                    <Image
                      src={post.coverImage}
                      alt=""
                      fill
                      priority={index === 0}
                      sizes={index === 0 ? "100vw" : "(max-width: 640px) 100vw, 50vw"}
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                )}

                <div className="pt-4">
                  {post.publishedAt && (
                    <time
                      dateTime={post.publishedAt.toISOString()}
                      className="meta text-muted"
                    >
                      {post.publishedAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                  )}
                  <h2
                    className={
                      "mt-2 font-black uppercase leading-[0.95] tracking-[-0.03em] " +
                      (index === 0 ? "text-3xl sm:text-4xl" : "text-xl")
                    }
                  >
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
