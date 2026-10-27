import Image from "next/image";
import Link from "next/link";

import type { ResolvedSite } from "@/lib/site";

function whatsappHref(number: string) {
  const digits = number.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits.replace(/^0/, "62")}` : null;
}

function instagramHref(value: string) {
  return /^https?:\/\//i.test(value)
    ? value
    : `https://instagram.com/${value.replace(/^@/, "")}`;
}

export function Footer({ site }: { site: ResolvedSite }) {
  const contact = [
    site.whatsapp && { label: "WhatsApp", text: site.whatsapp, href: whatsappHref(site.whatsapp) },
    site.email && { label: "Email", text: site.email, href: `mailto:${site.email}` },
    site.instagram && { label: "Instagram", text: site.instagram, href: instagramHref(site.instagram) },
  ].filter((item): item is { label: string; text: string; href: string | null } => Boolean(item));

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
              {site.footerTagline}
            </p>
            <p className="meta mt-5 text-muted">{site.footerMotto}</p>

            {contact.length > 0 && (
              <ul className="mt-5 space-y-1 text-sm text-ink-soft">
                {contact.map((item) => (
                  <li key={item.label}>
                    <span className="meta mr-2 text-muted">{item.label}</span>
                    {item.href ? (
                      <a
                        href={item.href}
                        className="transition-colors hover:text-accent"
                        {...(item.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                      >
                        {item.text}
                      </a>
                    ) : (
                      item.text
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {site.footerColumns.map((column) => (
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
          <p>© {new Date().getFullYear()} {site.copyrightName}. All rights reserved.</p>
          <p className="meta">{site.paymentLine}</p>
        </div>
      </div>
    </footer>
  );
}
