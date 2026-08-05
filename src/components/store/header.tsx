"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useCart } from "./cart-store";

export type NavLink = { href: string; label: string };

export function Header({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count, open, hydrated } = useCart();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Overlays are closed by the handlers that navigate, not by an effect
  // watching the pathname — that version re-renders the whole header on every
  // navigation just to set two booleans that are usually already false.
  const closeOverlays = () => {
    setMenuOpen(false);
    setSearchOpen(false);
  };

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  /*
   * Dark header: the only horizontal lockup in the brand assets is
   * white-on-transparent (SEC WOVEN WHITE), and a black bar suits a terrace
   * brand better than the white one it replaced.
   */
  return (
    <header className="sticky top-0 z-40 bg-ink text-paper">
      <div className="mx-auto flex h-20 max-w-[1600px] items-center gap-4 px-5 sm:px-8">
        <button
          type="button"
          className="-ml-2 p-2 md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => {
            setSearchOpen(false);
            setMenuOpen((value) => !value);
          }}
        >
          <span aria-hidden className="block text-lg leading-none">
            {menuOpen ? "✕" : "☰"}
          </span>
        </button>

        <Link href="/" onClick={closeOverlays} className="shrink-0">
          <Image
            src="/brand/wordmark-white.png"
            alt="Lorechester"
            width={1400}
            height={391}
            // Two stacked lines of type, so it needs more height than a
            // single-line wordmark to stay legible.
            priority
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex" aria-label="Main">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeOverlays}
                aria-current={active ? "page" : undefined}
                className={
                  "meta transition-colors hover:text-paper " +
                  (active
                    ? "text-paper underline decoration-accent decoration-2 underline-offset-8"
                    : "text-paper/55")
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="p-2 text-paper/70 transition-colors hover:text-paper"
            aria-label="Search"
            aria-expanded={searchOpen}
            onClick={() => {
              setMenuOpen(false);
              setSearchOpen((value) => !value);
            }}
          >
            <span aria-hidden className="meta">
              Search
            </span>
          </button>

          <button
            type="button"
            onClick={open}
            className="relative p-2 text-paper/70 transition-colors hover:text-paper"
            aria-label={`Open bag${hydrated && count > 0 ? `, ${count} items` : ""}`}
          >
            <span aria-hidden className="meta">
              Bag
            </span>
            {hydrated && count > 0 && (
              <span className="absolute -top-0.5 right-0 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-paper-pure">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-paper/15 bg-ink px-5 py-3 sm:px-8">
          <form
            className="mx-auto flex max-w-[1600px] items-center gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const query = searchRef.current?.value.trim();
              closeOverlays();
              router.push(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
            }}
          >
            <input
              ref={searchRef}
              type="search"
              name="q"
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full border-0 border-b border-paper/25 bg-transparent py-2 text-lg tracking-tight text-paper outline-none placeholder:text-paper/40 focus:border-paper"
            />
            <button type="submit" className="meta text-paper/70 hover:text-paper">
              Go
            </button>
          </form>
        </div>
      )}

      {menuOpen && (
        <nav
          className="border-t border-paper/15 bg-ink px-5 py-4 md:hidden"
          aria-label="Mobile"
        >
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeOverlays}
                  className="block py-2 text-2xl font-black uppercase tracking-tight text-paper"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
