import Image from "next/image";
import Link from "next/link";

import { NotifyMe } from "@/components/store/notify-me";
import { ProductCard, ProductGrid } from "@/components/store/product-card";
import { ShowcaseBand } from "@/components/store/showcase-band";
import { getCollections, getFeaturedProducts } from "@/lib/catalog";
import { getPublishedShowcases } from "@/lib/content";

// ponytail: rendered per-request so stock and sold-out badges are never stale.
// Switch to `revalidate = 60` + revalidatePath from the payment webhook if
// traffic ever makes the per-request query cost show up.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, collections, showcases] = await Promise.all([
    getFeaturedProducts(8),
    getCollections(),
    getPublishedShowcases(1),
  ]);

  const hero = collections[0];
  const heroImage = hero?.heroImage ?? featured[0]?.image?.url ?? null;
  const upcoming = collections.find(
    (collection) => collection.releaseAt && collection.releaseAt > new Date(),
  );

  return (
    <>
      {/* Hero -------------------------------------------------------------- */}
      <section className="relative flex min-h-[78vh] items-end overflow-hidden bg-ink">
        {heroImage && (
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-70"
          />
        )}
        {/* Scrim: without it, white type over a bright photo fails contrast. */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-ink/30" />

        <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-16 pt-32 sm:px-8">
          <h1 className="max-w-4xl text-display font-black uppercase text-paper">
            {hero?.title ?? "Lorechester"}
          </h1>
          {hero?.description && (
            <p className="mt-5 max-w-md text-sm leading-relaxed text-paper/80">
              {hero.description}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={hero ? `/shop/${hero.slug}` : "/shop"}
              className="meta flex h-12 items-center border border-paper px-8 text-paper transition-colors hover:bg-paper hover:text-ink"
            >
              Shop the drop
            </Link>
            <Link
              href="/shop"
              className="meta flex h-12 items-center px-4 text-paper/70 transition-colors hover:text-paper"
            >
              All products →
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming drop ----------------------------------------------------- */}
      {upcoming && (
        <section className="border-b border-line bg-accent-soft px-5 py-4 sm:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
            <p className="meta text-accent">
              Next drop — {upcoming.title}
            </p>
            <time
              dateTime={upcoming.releaseAt!.toISOString()}
              className="meta text-ink"
            >
              {upcoming.releaseAt!.toLocaleString("en-GB", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              WIB
            </time>
          </div>
        </section>
      )}

      {/* Featured ---------------------------------------------------------- */}
      <section className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <h2 className="text-headline font-black uppercase">Featured</h2>
          <Link href="/shop" className="meta text-muted hover:text-ink">
            View all
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="border border-dashed border-line px-6 py-16 text-center text-sm text-muted">
            No featured products yet. Mark some as featured in the admin.
          </p>
        ) : (
          <ProductGrid>
            {featured.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 4}
              />
            ))}
          </ProductGrid>
        )}
      </section>

      {/* Lookbook ---------------------------------------------------------- */}
      {showcases[0] && <ShowcaseBand showcase={showcases[0]} />}

      {/* Editorial band ---------------------------------------------------- */}
      {featured[1]?.image && (
        <section className="relative grid min-h-[60vh] items-center bg-ink md:grid-cols-2">
          <div className="relative h-full min-h-[50vh]">
            <Image
              src={featured[1].image.url}
              alt={featured[1].image.alt || featured[1].title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="px-5 py-16 sm:px-12">
            <p className="meta text-paper/50">
              Between the stone, steel, and stitch
            </p>
            <h2 className="mt-4 text-headline font-black uppercase text-paper">
              Cut heavy.
              <br />
              Printed small.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-paper/70">
              Every article gets a code before it gets a name, and every run is
              capped. We print what we can stand behind, sell it once, and move
              on to the next one.
            </p>
            <Link
              href="/about"
              className="meta mt-8 inline-block border-b border-paper pb-1 text-paper"
            >
              Read more
            </Link>
          </div>
        </section>
      )}

      {/* Drop list --------------------------------------------------------- */}
      <section className="border-t border-line py-20">
        <div className="mx-auto max-w-xl px-5 text-center sm:px-8">
          <h2 className="text-headline font-black uppercase">
            Get the drop first
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Runs are small and they go fast. Join the list and we&apos;ll message
            you before the next one goes live — no other email, ever.
          </p>
          <div className="mx-auto mt-6 max-w-sm text-left">
            <NotifyMe label="Join" placeholder="your@email.com" />
          </div>
        </div>
      </section>
    </>
  );
}
