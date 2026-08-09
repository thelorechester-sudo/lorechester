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
   * Light header on paper. The horizontal lockup asset is white-on-transparent
   * so it can't be used here — the roundel (black with a red hub) plus the
   * two-line LORE / CHESTER wordmark set in type is the lockup on light ground.
   */
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 text-ink backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-4 px-5 sm:px-8">
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

        <Link
          href="/"
          onClick={closeOverlays}
          aria-label="Lorechester, home"
          className="flex shrink-0 items-center gap-2.5"
        >
          <Image
            src="/brand/roundel.png"
            alt=""
            aria-hidden
            width={700}
            height={700}
            priority
            className="size-9 shrink-0"
          />
          <span
            aria-hidden
            className="text-[0.8125rem] font-black uppercase leading-[0.82] tracking-[-0.02em]"
          >
            Lore
            <br />
            Chester
          </span>
        </Link>

        {/* Centred nav — the utilities sit on the rail, the way in sits in the
            middle. On md the absolute centring keeps it optically centred no
            matter how wide the lockup or the bag counter get. */}
        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex"
          aria-label="Main"
        >
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
                  "meta relative py-1 transition-colors hover:text-ink " +
                  (active ? "text-ink" : "text-muted")
                }
              >
                {link.label}
                <span
                  aria-hidden
                  className={
                    "absolute -bottom-0.5 left-0 h-px w-full origin-left bg-accent transition-transform duration-300 ease-out-expo " +
                    (active ? "scale-x-100" : "scale-x-0")
                  }
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <button
            type="button"
            className="meta text-muted transition-colors hover:text-ink"
            aria-expanded={searchOpen}
            onClick={() => {
              setMenuOpen(false);
              setSearchOpen((value) => !value);
            }}
          >
            {searchOpen ? "Close" : "Search"}
          </button>

          <button
            type="button"
            onClick={open}
            className="meta text-ink transition-colors hover:text-accent"
            aria-label={`Open bag${hydrated && count > 0 ? `, ${count} items` : ""}`}
          >
            Bag
            <span aria-hidden className="text-muted">
              {" "}
              ({hydrated ? count : 0})
            </span>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-line bg-paper px-5 py-5 sm:px-8">
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
              placeholder="Search articles or codes — CPS-825"
              aria-label="Search products"
              className="w-full border-0 border-b border-line bg-transparent py-2 text-xl tracking-tight outline-none placeholder:text-muted/60 focus:border-ink"
            />
            <button type="submit" className="meta text-muted hover:text-ink">
              Go
            </button>
          </form>
        </div>
      )}

      {menuOpen && (
        <nav
          className="border-t border-line bg-paper px-5 py-6 md:hidden"
          aria-label="Mobile"
        >
          <ul>
            {links.map((link) => (
              <li key={link.href} className="border-b border-line last:border-0">
                <Link
                  href={link.href}
                  onClick={closeOverlays}
                  className="block py-3 text-2xl font-black uppercase tracking-tight"
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
