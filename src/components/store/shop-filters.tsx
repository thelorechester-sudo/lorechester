import Link from "next/link";

import { PRICE_BANDS } from "@/lib/catalog";

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

/* -------------------------------------------------------------------------
   Icons — inline so the rail costs no extra request and inherits currentColor.
   ---------------------------------------------------------------------- */

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className={"size-3 shrink-0 " + className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="square" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden
      className="size-2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M1.25 5.25 3.75 7.5 8.75 2.5" strokeLinecap="square" />
    </svg>
  );
}

/* -------------------------------------------------------------------------
   Rail primitives
   ---------------------------------------------------------------------- */

/**
 * A collapsible facet group. `<details>` rather than React state so the whole
 * rail stays a server component — no hydration for a list of links.
 */
function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group/section border-t border-line first:border-t-0"
    >
      <summary className="meta flex cursor-pointer list-none items-center justify-between px-4 py-3.5 transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
        {title}
        <Chevron className="text-muted transition-transform duration-200 group-open/section:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

/**
 * One facet value. A link, not an input — the filtered listing is a URL, so it
 * is shareable, bookmarkable and works before JS. The box/dot is decorative;
 * `aria-current` is what carries the state.
 */
function Option({
  href,
  active,
  shape = "box",
  children,
}: {
  href: string;
  active: boolean;
  shape?: "box" | "dot";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className="group/opt flex items-center gap-2.5 py-1.5 text-sm leading-tight text-muted transition-colors hover:text-ink"
    >
      <span
        aria-hidden
        className={
          "flex size-[15px] shrink-0 items-center justify-center border transition-colors " +
          (shape === "dot" ? "rounded-full " : "") +
          (active
            ? "border-ink bg-ink text-paper"
            : "border-line bg-paper-pure group-hover/opt:border-ink")
        }
      >
        {active &&
          (shape === "dot" ? (
            <span className="size-1.5 rounded-full bg-paper" />
          ) : (
            <Check />
          ))}
      </span>
      <span className={active ? "text-ink" : undefined}>{children}</span>
    </Link>
  );
}

/* -------------------------------------------------------------------------
   The rail
   ---------------------------------------------------------------------- */

function Rail({
  base,
  params,
  categories,
  sizes,
}: {
  base: string;
  params: Params;
  categories: string[];
  sizes: string[];
}) {
  const anyFilter = Boolean(
    params.category || params.size || params.price || params.inStock || params.q,
  );

  return (
    <div className="border border-line bg-paper-pure">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="meta">Filter</span>
        {anyFilter && (
          <Link href={base} className="meta text-accent hover:underline">
            Clear all
          </Link>
        )}
      </div>

      {/* Plain GET form: submitting rewrites the query string the same way the
          facet links do, so search composes with every other filter. */}
      <form action={base} className="border-b border-line p-3">
        {Object.entries(params)
          .filter(([key, value]) => value && key !== "q")
          .map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        <div className="relative">
          <svg
            viewBox="0 0 14 14"
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="6" cy="6" r="4.25" />
            <path d="M9.25 9.25 12.5 12.5" strokeLinecap="square" />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search"
            aria-label="Search products"
            className="w-full border border-line bg-paper py-2.5 pl-9 pr-3 text-sm transition-colors placeholder:text-muted focus:border-ink"
          />
        </div>
      </form>

      {categories.length > 0 && (
        <Section title="Category">
          {categories.map((category) => (
            <Option
              key={category}
              href={buildHref(base, params, {
                category: params.category === category ? undefined : category,
              })}
              active={params.category === category}
            >
              {category}
            </Option>
          ))}
        </Section>
      )}

      {sizes.length > 0 && (
        <Section title="Size">
          {sizes.map((size) => (
            <Option
              key={size}
              href={buildHref(base, params, {
                size: params.size === size ? undefined : size,
              })}
              active={params.size === size}
            >
              {size}
            </Option>
          ))}
        </Section>
      )}

      <Section title="Price">
        {PRICE_BANDS.map((band) => (
          <Option
            key={band.id}
            shape="dot"
            href={buildHref(base, params, {
              price: params.price === band.id ? undefined : band.id,
            })}
            active={params.price === band.id}
          >
            {band.label}
          </Option>
        ))}
      </Section>

      <Section title="Availability">
        <Option
          shape="dot"
          href={buildHref(base, params, { inStock: undefined })}
          active={!params.inStock}
        >
          All
        </Option>
        <Option
          shape="dot"
          href={buildHref(base, params, { inStock: "1" })}
          active={Boolean(params.inStock)}
        >
          In stock
        </Option>
      </Section>
    </div>
  );
}

/**
 * The rail in both of its forms: a disclosure on narrow screens, a sticky
 * column from `lg` up.
 *
 * Rendered twice rather than moved with JS. `hidden` is `display: none`, so
 * exactly one copy is in the accessibility tree at any width, and neither
 * copy needs client-side state to open.
 */
export function ShopFilterPanel(props: {
  base: string;
  params: Params;
  categories: string[];
  sizes: string[];
}) {
  return (
    <>
      <details className="group/mobile mb-6 lg:hidden">
        <summary className="meta flex cursor-pointer list-none items-center justify-between border border-line bg-paper-pure px-4 py-3.5 [&::-webkit-details-marker]:hidden">
          Filter
          <Chevron className="text-muted transition-transform duration-200 group-open/mobile:rotate-180" />
        </summary>
        <div className="mt-2">
          <Rail {...props} />
        </div>
      </details>

      <aside className="hidden shrink-0 lg:block lg:w-[248px]">
        <div className="sticky top-24">
          <Rail {...props} />
        </div>
      </aside>
    </>
  );
}

/* -------------------------------------------------------------------------
   Toolbar
   ---------------------------------------------------------------------- */

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
] as const;

export function SortMenu({ base, params }: { base: string; params: Params }) {
  const active = params.sort ?? "newest";
  const current = SORTS.find((option) => option.value === active) ?? SORTS[0];

  /*
   * ponytail: a <details> menu has no outside-click dismiss — picking an
   * option navigates, which closes it, and that covers the real path. Move to
   * the popover API if a stray open menu ever becomes a complaint.
   */
  return (
    <details className="group/sort relative">
      <summary className="meta flex cursor-pointer list-none items-center gap-2 border border-line bg-paper-pure px-3 py-2.5 transition-colors hover:border-ink [&::-webkit-details-marker]:hidden">
        <span className="text-muted">Sort</span>
        {current.label}
        <Chevron className="text-muted transition-transform duration-200 group-open/sort:rotate-180" />
      </summary>
      <div className="absolute right-0 z-30 mt-1 w-56 border border-ink bg-paper-pure p-1">
        {SORTS.map((option) => (
          <Link
            key={option.value}
            href={buildHref(base, params, {
              sort: option.value === "newest" ? undefined : option.value,
            })}
            aria-current={option.value === active ? "true" : undefined}
            className={
              "block px-3 py-2 text-sm transition-colors " +
              (option.value === active
                ? "bg-ink text-paper"
                : "text-muted hover:bg-paper hover:text-ink")
            }
          >
            {option.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

export function ResultCount({
  count,
  query,
}: {
  count: number;
  query?: string;
}) {
  return (
    <p className="meta text-muted">
      {count} {count === 1 ? "piece" : "pieces"}
      {query && ` for “${query}”`}
    </p>
  );
}
