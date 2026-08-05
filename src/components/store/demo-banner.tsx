import { DEMO_MODE } from "@/lib/demo";

/**
 * Unmistakable marker that the catalog is fixture data.
 * Renders nothing once NEXT_PUBLIC_DEMO_MODE is removed.
 */
export function DemoBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div className="bg-accent px-5 py-2 text-center text-paper-pure sm:px-8">
      <p className="meta">
        Preview mode — demo products, no database. Checkout and signups are
        disabled.
      </p>
    </div>
  );
}
