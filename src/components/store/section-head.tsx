import Link from "next/link";

/**
 * The one section header the storefront uses: a numbered index in mono, the
 * title, a hairline out to the right edge, and an optional link on the end.
 * The index is a nod to the article codes — sections get numbered the way
 * articles do.
 */
export function SectionHead({
  index,
  title,
  href,
  linkLabel = "View all",
}: {
  index?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <header className="mb-8 flex items-baseline gap-4 sm:gap-6">
      {index && <span className="meta hidden text-muted sm:block">{index}</span>}
      <h2 className="text-headline font-black uppercase">{title}</h2>
      <span aria-hidden className="h-px flex-1 bg-line" />
      {href && (
        <Link
          href={href}
          className="meta shrink-0 text-muted transition-colors hover:text-ink"
        >
          {linkLabel}
        </Link>
      )}
    </header>
  );
}
