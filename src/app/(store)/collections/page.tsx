import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getCollections } from "@/lib/catalog";

// Collections are admin-editable, so this reads at request time like the rest
// of the storefront — see the note in src/app/(store)/page.tsx.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collections",
  description: "Every Lorechester drop, newest first.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const collections = await getCollections();
  const now = new Date();

  return (
    <div className="mx-auto max-w-[1600px] px-5 py-10 sm:px-8">
      <h1 className="text-headline font-semibold uppercase">Collections</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        Every drop, newest first. Once a run is gone, it&apos;s gone.
      </p>

      {collections.length === 0 ? (
        <p className="meta mt-12 text-muted">No collections yet.</p>
      ) : (
        <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => {
            const upcoming =
              collection.releaseAt && collection.releaseAt > now;

            return (
              <li key={collection.id}>
                <Link href={`/shop/${collection.slug}`} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-paper-pure">
                    {collection.heroImage ? (
                      <Image
                        src={collection.heroImage}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="meta absolute inset-0 flex items-center justify-center text-muted">
                        No image
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-xl font-semibold uppercase leading-[0.95] tracking-[-0.03em]">
                    {collection.title}
                  </h2>

                  {upcoming && (
                    <p className="meta mt-2 text-accent">
                      Drops{" "}
                      {collection.releaseAt!.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "long",
                      })}{" "}
                      WIB
                    </p>
                  )}

                  {collection.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                      {collection.description}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
