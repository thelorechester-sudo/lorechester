import { AnnouncementBar } from "@/components/store/announcement-bar";
import { CartDrawer } from "@/components/store/cart-drawer";
import { CartProvider } from "@/components/store/cart-store";
import { DemoBanner } from "@/components/store/demo-banner";
import { Footer } from "@/components/store/footer";
import { Header, type NavLink } from "@/components/store/header";
import { getCollections } from "@/lib/catalog";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/config";

/*
 * The header reads collections from the database, so every page under this
 * layout is request-time rendered. That also keeps `next build` from needing a
 * live database connection just to prerender the static copy pages.
 */
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  // An unconfigured deploy never reaches here — proxy.ts rewrites to /setup.
  const collections = await getCollections();

  const links: NavLink[] = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    // Newest drop gets its own top-level entry; the rest live under /shop. It
    // is labelled generically so the nav does not change width every drop.
    ...collections.slice(0, 1).map((collection) => ({
      href: `/shop/${collection.slug}`,
      label: "Collection",
    })),
    { href: "/journal", label: "Journal" },
    { href: "/about", label: "About" },
  ];

  return (
    <CartProvider>
      <a
        href="#main"
        className="sr-only-focusable meta absolute left-2 top-2 z-50 bg-ink px-3 py-2 text-paper"
      >
        Skip to content
      </a>

      <DemoBanner />
      <AnnouncementBar freeShippingThreshold={FREE_SHIPPING_THRESHOLD} />
      <Header links={links} />

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer />
      <CartDrawer freeShippingThreshold={FREE_SHIPPING_THRESHOLD} />
    </CartProvider>
  );
}
