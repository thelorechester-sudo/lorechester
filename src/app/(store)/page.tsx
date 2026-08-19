import Image from "next/image";
import Link from "next/link";

import { NotifyMe } from "@/components/store/notify-me";
import { ProductCard, ProductGrid } from "@/components/store/product-card";
import { SectionHead } from "@/components/store/section-head";
import { ShowcaseBand } from "@/components/store/showcase-band";
import {
  getCollections,
  getFeaturedProducts,
  getShopProducts,
} from "@/lib/catalog";
import { getHomeSettings, getPublishedShowcases } from "@/lib/content";

// ponytail: rendered per-request so stock and sold-out badges are never stale.
// Switch to `revalidate = 60` + revalidatePath from the payment webhook if
// traffic ever makes the per-request query cost show up.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, collections, showcases, all, home] = await Promise.all([
    getFeaturedProducts(8),
    getCollections(),
    getPublishedShowcases(1),
    // Reused for the category tiles: one query, first image per category. The
    // catalog is small enough that a dedicated grouped query would be a
    // second query to save nothing.
    getShopProducts({ sort: "newest" }),
    // Admin-editable copy. Every field falls back to the wording this page
    // shipped with, so an untouched settings row renders identically.
    getHomeSettings(),
  ]);

  const hero = collections[0];
  const heroImage =
    home.heroImage ?? hero?.heroImage ?? featured[0]?.image?.url ?? null;
  /*
   * Admin override first, otherwise the second featured product's shot, which
   * is what this band used before it was editable.
   */
  const bandImage = home.editorialImage
    ? { url: home.editorialImage, alt: "" }
    : featured[1]?.image
      ? {
          url: featured[1].image.url,
          alt: featured[1].image.alt || featured[1].title,
        }
      : null;

  const upcoming = collections.find(
    (collection) => collection.releaseAt && collection.releaseAt > new Date(),
  );

  const categories = [
    ...new Map(
      all
        .filter((product) => product.category && product.image)
        .map((product) => [
          product.category!,
          { name: product.category!, image: product.image! },
        ]),
    ).values(),
  ].slice(0, 4);

  return (
    <>
      {/* Hero -------------------------------------------------------------- */}
      <section className="relative flex min-h-[calc(100svh-72px)] items-end overflow-hidden bg-ink">
        {heroImage && (
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        {/* Scrim: without it, white type over a bright photo fails contrast. */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/10" />

        <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-14 pt-32 sm:px-8">
          <p className="meta text-paper/60">
            {hero ? "Current drop" : "Lorechester"} — {home.heroEyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl text-display font-semibold uppercase text-paper">
            {hero?.title ?? "Lorechester"}
          </h1>
          {hero?.description && (
            <p className="mt-5 max-w-md text-sm leading-relaxed text-paper/75">
              {hero.description}
            </p>
          )}
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href={hero ? `/shop/${hero.slug}` : "/shop"}
              className="meta flex h-12 items-center bg-paper px-9 text-ink transition-colors hover:bg-accent hover:text-paper-pure"
            >
              {home.heroPrimaryCta}
            </Link>
            <Link
              href="/shop"
              className="meta flex h-12 items-center border border-paper/40 px-9 text-paper transition-colors hover:border-paper"
            >
              {home.heroSecondaryCta}
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming drop ----------------------------------------------------- */}
      {upcoming && (
        <section className="border-b border-line bg-ink px-5 py-3.5 sm:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
            <p className="meta text-paper">
              <span className="text-accent">●</span> Next drop — {upcoming.title}
            </p>
            <time
              dateTime={upcoming.releaseAt!.toISOString()}
              className="meta text-paper/60"
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

      {/* Categories -------------------------------------------------------- */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8">
          <SectionHead index="01" title="By article" />
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={`/shop?category=${encodeURIComponent(category.name)}`}
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-paper-pure">
                  <Image
                    src={category.image.url}
                    alt=""
                    aria-hidden
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-ink/10 transition-colors duration-500 group-hover:bg-ink/35" />
                  <span className="meta absolute bottom-4 left-4 text-paper">
                    {category.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured ---------------------------------------------------------- */}
      <section className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8">
        <SectionHead
          index="02"
          title={home.featuredHeading}
          href="/shop"
          linkLabel={home.featuredLinkLabel}
        />

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
      {bandImage && (
        <section className="relative grid min-h-[70vh] items-center bg-ink md:grid-cols-2">
          <div className="relative h-full min-h-[50vh]">
            <Image
              src={bandImage.url}
              alt={bandImage.alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="px-5 py-20 sm:px-16">
            <p className="meta text-accent">{home.editorialEyebrow}</p>
            {/* Line breaks in the admin field are meaningful here. */}
            <h2 className="mt-5 whitespace-pre-line text-headline font-semibold uppercase text-paper">
              {home.editorialHeading}
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-paper/70">
              {home.editorialBody}
            </p>
            <Link
              href={home.editorialHref}
              className="meta mt-9 inline-block border-b border-paper/40 pb-1 text-paper transition-colors hover:border-accent"
            >
              {home.editorialCta}
            </Link>
          </div>
        </section>
      )}

      {/* Drop list --------------------------------------------------------- */}
      <section className="border-t border-line py-24">
        <div className="mx-auto max-w-xl px-5 text-center sm:px-8">
          <Image
            src="/brand/roundel.png"
            alt=""
            aria-hidden
            width={700}
            height={700}
            className="mx-auto size-12"
          />
          <h2 className="mt-6 text-headline font-semibold uppercase">
            {home.dropHeading}
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {home.dropBody}
          </p>
          <div className="mx-auto mt-7 max-w-sm text-left">
            <NotifyMe label="Join" placeholder="your@email.com" />
          </div>
        </div>
      </section>
    </>
  );
}
