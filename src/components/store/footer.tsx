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
    <footer className="mt-24 border-t border-line bg-ink text-paper">
      <div className="mx-auto max-w-[1600px] px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Image
              src="/brand/wordmark-white.png"
              alt="Lorechester"
              width={1400}
              height={391}
              className="h-10 w-auto"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/60">
              Uncommon wear on your terraces. Heavyweight cut-and-sew, printed in
              small runs, made and shipped from Indonesia.
            </p>
            <p className="meta mt-4 text-paper/40">
              Jongeren uit Zuidoost-Azië
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="meta text-paper/50">{column.title}</h2>
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-paper/80 transition-colors hover:text-paper"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-paper/15 pt-6 text-xs text-paper/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Lorechester. All rights reserved.</p>
          <p className="meta">Pay with QRIS · GoPay · Virtual Account · Card</p>
        </div>
      </div>
    </footer>
  );
}
