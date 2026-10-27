import { AnnouncementBar } from "@/components/store/announcement-bar";
import { CartDrawer } from "@/components/store/cart-drawer";
import { CartProvider } from "@/components/store/cart-store";
import { DemoBanner } from "@/components/store/demo-banner";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { getCollections } from "@/lib/catalog";
import { getHomeSettings, getSiteSettings } from "@/lib/content";

/*
 * The header reads collections from the database, so every page under this
 * layout is request-time rendered. That also keeps `next build` from needing a
 * live database connection just to prerender the static copy pages.
 */
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  // An unconfigured deploy never reaches here — proxy.ts rewrites to /setup.
  const [collections, home, site] = await Promise.all([
    getCollections(),
    getHomeSettings(),
    getSiteSettings(),
  ]);

  // The menu is admin-editable. /collections is hidden while there are none,
  // so the nav never points at an empty page.
  const links = site.nav.filter(
    (link) => link.href !== "/collections" || collections.length > 0,
  );

  return (
    <CartProvider>
      <a
        href="#main"
        className="sr-only-focusable meta absolute left-2 top-2 z-50 bg-ink px-3 py-2 text-paper"
      >
        Skip to content
      </a>

      <DemoBanner />
      <AnnouncementBar
        freeShippingThreshold={site.freeShippingThreshold}
        messages={home.marquee}
      />
      <Header links={links} />

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer site={site} />
      <CartDrawer freeShippingThreshold={site.freeShippingThreshold} />
    </CartProvider>
  );
}
