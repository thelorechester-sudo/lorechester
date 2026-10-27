"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { cx } from "@/components/admin/ui";

type NavLink = { href: string; label: string; exact?: boolean };

/*
 * Grouped by what the owner is doing, not by how the database is shaped.
 * Add an entry here only once the route actually exists.
 */
const GROUPS: { title: string | null; links: NavLink[] }[] = [
  { title: null, links: [{ href: "/admin", label: "Overview", exact: true }] },
  {
    title: "Sell",
    links: [
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/products", label: "Products" },
      { href: "/admin/collections", label: "Collections" },
      { href: "/admin/discounts", label: "Discounts" },
    ],
  },
  {
    title: "Website",
    links: [
      { href: "/admin/home", label: "Home page" },
      { href: "/admin/pages", label: "Pages" },
      { href: "/admin/journal", label: "Journal" },
      { href: "/admin/showcase", label: "Showcase" },
    ],
  },
  {
    title: "Customers",
    links: [{ href: "/admin/waitlist", label: "Waitlist" }],
  },
  {
    title: "Store",
    links: [
      { href: "/admin/settings", label: "Site settings" },
      { href: "/admin/notifications", label: "Order alerts" },
    ],
  },
];

function isActive(pathname: string, link: NavLink) {
  return link.exact ? pathname === link.href : pathname.startsWith(link.href);
}

function NavList({
  toPack,
  large,
  onNavigate,
}: {
  /** Paid orders waiting to be packed; shown as a count beside Orders. */
  toPack: number;
  /** Bigger tap targets for the phone menu. */
  large?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.title ?? "top"}>
          {group.title && (
            <p className="meta mb-1.5 px-3 text-muted">{group.title}</p>
          )}
          <ul className="space-y-0.5">
            {group.links.map((link) => {
              const active = isActive(pathname, link);
              const badge = link.href === "/admin/orders" ? toPack : 0;

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex items-center justify-between rounded-md px-3 text-sm transition-colors",
                      large ? "h-12" : "h-9",
                      active
                        ? "bg-ink font-medium text-paper"
                        : "text-ink hover:bg-line-soft",
                    )}
                  >
                    {link.label}
                    {badge > 0 && (
                      <span
                        className={cx(
                          "meta rounded-full px-2 py-0.5",
                          active ? "bg-paper text-ink" : "bg-accent text-paper",
                        )}
                        aria-label={`${badge} to pack`}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Fixed left column on wide screens. */
export function AdminSidebar({ toPack }: { toPack: number }) {
  return (
    <aside className="hidden w-52 shrink-0 lg:block">
      <div className="sticky top-24">
        <NavList toPack={toPack} />
      </div>
    </aside>
  );
}

/**
 * Menu button + full-screen panel for phones and tablets, where the sidebar
 * does not fit. `footer` carries the store link and sign-out so the header
 * stays uncluttered.
 */
export function AdminMobileMenu({
  toPack,
  footer,
}: {
  toPack: number;
  footer: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Links close the menu themselves via onNavigate; Escape closes it too.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="admin-menu"
        className="meta -ml-2 flex h-10 items-center gap-2 rounded-md px-2 text-ink hover:bg-line-soft"
      >
        <span aria-hidden className="flex w-4 flex-col gap-[3px]">
          <span className="h-px bg-ink" />
          <span className="h-px bg-ink" />
          <span className="h-px bg-ink" />
        </span>
        {open ? "Close" : "Menu"}
        {!open && toPack > 0 && (
          <span
            className="size-2 rounded-full bg-accent"
            aria-label={`${toPack} orders to pack`}
          />
        )}
      </button>

      {open && (
        <div
          id="admin-menu"
          // Absolute against the sticky header, not fixed: the header's
          // backdrop-blur would otherwise become the containing block.
          className="absolute inset-x-0 top-full h-[calc(100dvh-3.5rem)] overflow-y-auto bg-paper-pure px-4 pb-10 pt-4"
        >
          <NavList toPack={toPack} large onNavigate={() => setOpen(false)} />
          <div className="mt-8 space-y-1 border-t border-line pt-4">{footer}</div>
        </div>
      )}
    </div>
  );
}
