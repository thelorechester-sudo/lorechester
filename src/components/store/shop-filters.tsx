import Link from "next/link";

import type { Facet, ShopListing } from "@/lib/catalog";
import { PRICE_BANDS } from "@/lib/catalog";

/**
 * The filter state as it lives in the URL. `category` and `size` are
 * comma-joined lists — `?size=M,L` — so a shopper can ask for more than one
 * without the query string growing a new syntax.
 */
export type Params = {
  category?: string;
  size?: string;
  price?: string;
  sort?: string;
  inStock?: string;
  q?: string;
};

export function list(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

/** Add or remove one value from a comma-joined param. */
function toggle(value: string | undefined, item: string): string | undefined {
  const values = list(value);
  const next = values.includes(item)
    ? values.filter((v) => v !== item)
    : [...values, item];
  return next.length ? next.join(",") : undefined;
}

/** Build the URL for changing one filter, preserving the others. */
function buildHref(base: string, params: Params, patch: Params): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...patch })) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `${base}?${query}` : base;
}

/** Every filter currently applied, as removable chips. */
function activeFilters(params: Params) {
  const active: { label: string; patch: Params }[] = [];

  if (params.q) active.push({ label: `“${params.q}”`, patch: { q: undefined } });
  for (const category of list(params.category)) {
    active.push({ label: category, patch: { category: toggle(params.category, category) } });
  }
  for (const size of list(params.size)) {
    active.push({ label: `Size ${size}`, patch: { size: toggle(params.size, size) } });
  }
  const band = PRICE_BANDS.find((b) => b.id === params.price);
  if (band) active.push({ label: band.label, patch: { price: undefined } });
  if (params.inStock) {
    active.push({ label: "In stock", patch: { inStock: undefined } });
  }

  return active;
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

function Cross() {
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden
      className="size-2.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5" strokeLinecap="square" />
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
  chosen,
  children,
}: {
  title: string;
  /** How many values in this group are picked, shown when it is collapsed. */
  chosen?: number;
  children: React.ReactNode;
}) {
  return (
    <details
      open
      className="group/section border-t border-line first:border-t-0"
    >
      <summary className="meta flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
        {title}
        {chosen ? (
          <span className="flex size-4 items-center justify-center rounded-full bg-ink text-[0.5625rem] tracking-normal text-paper group-open/section:hidden">
            {chosen}
          </span>
        ) : null}
        <Chevron className="ml-auto text-muted transition-transform duration-200 group-open/section:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

/**
 * One facet value. A link, not an input — the filtered listing is a URL, so it
 * is shareable, bookmarkable and works before JS. The box/dot is decorative;
 * `aria-current` is what carries the state.
 *
 * A value that would return nothing renders as plain text instead of a link:
 * there is nowhere useful for it to go, and offering the click is what made
 * two-click dead ends possible.
 */
function Option({
  href,
  active,
  count,
  shape = "box",
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  shape?: "box" | "dot";
  children: React.ReactNode;
}) {
  const empty = count === 0 && !active;

  const box = (
    <span
      aria-hidden
      className={
        "flex size-[15px] shrink-0 items-center justify-center border transition-colors " +
        (shape === "dot" ? "rounded-full " : "rounded-[3px] ") +
        (active
          ? "border-ink bg-ink text-paper"
          : empty
            ? "border-line bg-paper"
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
  );

  const label = (
    <>
      <span className={active ? "text-ink" : undefined}>{children}</span>
      <span className="ml-auto pl-2 tabular-nums text-[0.6875rem] tabular-nums text-muted">
        {count}
      </span>
    </>
  );

  if (empty) {
    return (
      <p
        aria-disabled="true"
        className="flex items-center gap-2.5 py-1.5 text-sm leading-tight text-muted/45"
      >
        {box}
        {label}
      </p>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className="group/opt flex items-center gap-2.5 py-1.5 text-sm leading-tight text-muted transition-colors hover:text-ink"
    >
      {box}
      {label}
    </Link>
  );
}

/* -------------------------------------------------------------------------
   The rail
   ---------------------------------------------------------------------- */

type RailProps = {
  base: string;
  params: Params;
  listing: ShopListing;
};

function Rail({ base, params, listing }: RailProps) {
  const active = activeFilters(params);
  const chosenCategories = list(params.category);
  const chosenSizes = list(params.size);

  return (
    <div className="rounded-card border border-line bg-paper-pure">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="meta">Filter</span>
        {active.length > 0 && (
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
            placeholder="Search articles or codes"
            aria-label="Search products"
            className="w-full rounded-input border border-line bg-paper py-2.5 pl-9 pr-3 text-sm transition-colors placeholder:text-muted focus:border-ink"
          />
        </div>
      </form>

      {listing.categories.length > 0 && (
        <Section title="Category" chosen={chosenCategories.length}>
          {listing.categories.map((facet: Facet) => (
            <Option
              key={facet.value}
              count={facet.count}
              href={buildHref(base, params, {
                category: toggle(params.category, facet.value),
              })}
              active={chosenCategories.includes(facet.value)}
            >
              {facet.value}
            </Option>
          ))}
        </Section>
      )}

      {listing.sizes.length > 0 && (
        <Section title="Size" chosen={chosenSizes.length}>
          {listing.sizes.map((facet: Facet) => (
            <Option
              key={facet.value}
              count={facet.count}
              href={buildHref(base, params, {
                size: toggle(params.size, facet.value),
              })}
              active={chosenSizes.includes(facet.value)}
            >
              {facet.value}
            </Option>
          ))}
        </Section>
      )}

      <Section title="Price" chosen={params.price ? 1 : 0}>
        {listing.prices.map((band) => (
          <Option
            key={band.id}
            shape="dot"
            count={band.count}
            href={buildHref(base, params, {
              price: params.price === band.id ? undefined : band.id,
            })}
            active={params.price === band.id}
          >
            {band.label}
          </Option>
        ))}
      </Section>

      <Section title="Availability" chosen={params.inStock ? 1 : 0}>
        <Option
          count={listing.inStockCount}
          href={buildHref(base, params, {
            inStock: params.inStock ? undefined : "1",
          })}
          active={Boolean(params.inStock)}
        >
          In stock only
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
export function ShopFilterPanel(props: RailProps) {
  const count = activeFilters(props.params).length;

  return (
    <>
      <details className="group/mobile mb-6 lg:hidden">
        <summary className="meta flex cursor-pointer list-none items-center gap-2 rounded-input border border-line bg-paper-pure px-4 py-3.5 [&::-webkit-details-marker]:hidden">
          Filter
          {/* The collapsed rail hides every applied filter, so the count has to
              survive on the summary or the listing looks arbitrary. */}
          {count > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-ink text-[0.5625rem] tracking-normal text-paper">
              {count}
            </span>
          )}
          <span className="ml-auto tabular-nums text-[0.6875rem] tabular-nums text-muted">
            {props.listing.items.length}
          </span>
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

/**
 * The applied filters, above the grid where the results are. Each chip drops
 * its own filter — on a dead end that is the move a shopper wants, and
 * "Clear all" throws away the work that still had results in it.
 */
export function ActiveFilters({
  base,
  params,
}: {
  base: string;
  params: Params;
}) {
  const active = activeFilters(params);
  if (active.length === 0) return null;

  return (
    <ul className="mb-5 flex flex-wrap items-center gap-2">
      {active.map((filter) => (
        <li key={filter.label}>
          <Link
            href={buildHref(base, params, filter.patch)}
            className="meta flex items-center gap-1.5 rounded-pill border border-line bg-paper-pure py-1.5 pl-3 pr-2.5 text-ink transition-colors hover:border-ink"
          >
            {filter.label}
            <span className="sr-only">— remove filter</span>
            <Cross />
          </Link>
        </li>
      ))}
      {active.length > 1 && (
        <li>
          <Link
            href={base}
            className="meta px-1 text-accent underline-offset-4 hover:underline"
          >
            Clear all
          </Link>
        </li>
      )}
    </ul>
  );
}

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
      <summary className="meta flex cursor-pointer list-none items-center gap-2 rounded-input border border-line bg-paper-pure px-3 py-2.5 transition-colors hover:border-ink [&::-webkit-details-marker]:hidden">
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
              "block rounded-input px-3 py-2 text-sm transition-colors " +
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

/**
 * The dead end, with a way out of it that is not "start over". Dropping the
 * last filter added is nearly always what the shopper meant.
 */
export function NoResults({
  base,
  params,
}: {
  base: string;
  params: Params;
}) {
  const active = activeFilters(params);
  const last = active.at(-1);

  return (
    <div className="border border-dashed border-line px-6 py-20 text-center">
      <p className="text-sm text-muted">
        {active.length > 0
          ? "Nothing matches every filter at once."
          : "Nothing here yet."}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        {last && (
          <Link
            href={buildHref(base, params, last.patch)}
            className="meta border-b border-ink pb-1"
          >
            Drop {last.label}
          </Link>
        )}
        <Link
          href={active.length > 0 ? base : "/shop"}
          className="meta border-b border-line pb-1 text-muted hover:border-ink hover:text-ink"
        >
          {active.length > 0 ? "Clear all filters" : "Shop everything"}
        </Link>
      </div>
    </div>
  );
}
