"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/admin/ui";

/** Add an entry here only once the route actually exists. */
const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/discounts", label: "Discounts" },
  { href: "/admin/journal", label: "Journal" },
  { href: "/admin/showcase", label: "Showcase" },
  { href: "/admin/waitlist", label: "Waitlist" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Admin sections">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active ? "bg-ink text-paper" : "text-muted hover:bg-paper hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
