import Image from "next/image";
import Link from "next/link";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All products" },
      { href: "/shop?sort=newest", label: "New arrivals" },
      { href: "/shop?inStock=1", label: "In stock" },
      { href: "/lookbook", label: "Lookbook" },
    ],
  },
  {
    title: "Info",
    links: [
      { href: "/about", label: "About" },
      { href: "/orders/lookup", label: "Track an order" },
      { href: "/shipping-returns", label: "Shipping & returns" },
      { href: "/size-guide", label: "Size guide" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/returns", label: "Returns policy" },
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper text-ink">
      <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            {/* Roundel, not the lockup — the lockup asset is white-only and
                this footer sits on paper now. */}
            <Image
              src="/brand/roundel.png"
              alt="Lorechester"
              width={700}
              height={700}
              className="size-14"
            />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">
              Uncommon wear on your terraces. Heavyweight cut-and-sew, printed in
              small runs, made and shipped from Indonesia.
            </p>
            <p className="meta mt-5 text-muted">Jongeren uit Zuidoost-Azië</p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="meta text-muted">{column.title}</h2>
              <ul className="mt-5 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-soft transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Lorechester. All rights reserved.</p>
          <p className="meta">Pay with QRIS · GoPay · Virtual Account · Card</p>
        </div>
      </div>
    </footer>
  );
}
