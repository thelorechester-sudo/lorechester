import Link from "next/link";

type Params = Record<string, string | undefined>;

/** Build the URL for toggling one filter, preserving the others. */
function buildHref(base: string, params: Params, patch: Params): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...patch })) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `${base}?${query}` : base;
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={
        "meta border px-3 py-1.5 transition-colors " +
        (active
          ? "border-ink bg-ink text-paper"
          : "border-line text-muted hover:border-ink hover:text-ink")
      }
    >
      {children}
    </Link>
  );
}

export function ShopFilterBar({
  base,
  params,
  categories,
  sizes,
  resultCount,
}: {
  base: string;
  params: Params;
  categories: string[];
  sizes: string[];
  resultCount: number;
}) {
  const anyFilter = Boolean(
    params.category || params.size || params.inStock || params.q,
  );

  return (
    <div className="space-y-4 border-b border-line pb-6">
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="meta w-16 shrink-0 text-muted">Type</span>
          <Chip
            href={buildHref(base, params, { category: undefined })}
            active={!params.category}
          >
            All
          </Chip>
          {categories.map((category) => (
            <Chip
              key={category}
              href={buildHref(base, params, {
                category: params.category === category ? undefined : category,
              })}
              active={params.category === category}
            >
              {category}
            </Chip>
          ))}
        </div>
      )}

      {sizes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="meta w-16 shrink-0 text-muted">Size</span>
          <Chip
            href={buildHref(base, params, { size: undefined })}
            active={!params.size}
          >
            Any
          </Chip>
          {sizes.map((size) => (
            <Chip
              key={size}
              href={buildHref(base, params, {
                size: params.size === size ? undefined : size,
              })}
              active={params.size === size}
            >
              {size}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="meta w-16 shrink-0 text-muted">Sort</span>
        {(
          [
            ["newest", "Newest"],
            ["price-asc", "Price ↑"],
            ["price-desc", "Price ↓"],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            href={buildHref(base, params, {
              sort: value === "newest" ? undefined : value,
            })}
            active={(params.sort ?? "newest") === value}
          >
            {label}
          </Chip>
        ))}

        <Chip
          href={buildHref(base, params, {
            inStock: params.inStock ? undefined : "1",
          })}
          active={Boolean(params.inStock)}
        >
          In stock only
        </Chip>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <p className="meta text-muted">
          {resultCount} {resultCount === 1 ? "product" : "products"}
          {params.q && ` for “${params.q}”`}
        </p>
        {anyFilter && (
          <Link href={base} className="meta text-accent hover:underline">
            Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}
