"use client";

import { useMemo, useRef, useState } from "react";

import type { Region } from "@/lib/indonesia-regions";

/**
 * Searchable dropdown over a static, fully client-side list — province and
 * city never need a network round-trip, unlike the Biteship-backed district
 * search elsewhere on this form.
 *
 * `<details>` rather than a positioned-div-plus-listener combo: it is native
 * open/close and needs no outside-click handler. The one thing it does not
 * give you for free is closing itself when an *inner* click picks an option
 * rather than navigating — SortMenu (shop-filters.tsx) gets that for free
 * because its options are links; these aren't, so a ref closes it explicitly.
 */
export function RegionSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  disabledHint,
  error,
}: {
  id: string;
  label: string;
  options: Region[];
  value: Region | null;
  onChange: (region: Region) => void;
  placeholder: string;
  /** Shown instead of the search box when `options` is empty (e.g. "pick a province first"). */
  disabledHint?: string;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? options.filter((r) => r.name.toLowerCase().includes(q)) : options;
    return pool.slice(0, 50);
  }, [options, query]);

  function pick(region: Region) {
    onChange(region);
    setQuery("");
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="meta block text-muted">
        {label}
      </label>

      <details ref={detailsRef} className="group/region relative">
        <summary
          id={id}
          className={
            "flex cursor-pointer list-none items-center justify-between border border-line bg-paper-pure px-3 py-2.5 text-sm outline-none focus-visible:border-ink [&::-webkit-details-marker]:hidden " +
            (options.length === 0 ? "cursor-not-allowed text-muted" : "")
          }
        >
          <span className={value ? undefined : "text-muted"}>
            {value?.name ?? (options.length === 0 ? disabledHint : placeholder)}
          </span>
          <svg
            viewBox="0 0 12 12"
            aria-hidden
            className="size-3 shrink-0 text-muted transition-transform duration-200 group-open/region:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="square" />
          </svg>
        </summary>

        {options.length > 0 && (
          <div className="absolute z-20 mt-1 w-full border border-ink bg-paper-pure shadow-lg">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full border-b border-line px-3 py-2 text-sm outline-none"
            />
            <ul className="max-h-56 overflow-y-auto">
              {results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted">No matches.</li>
              ) : (
                results.map((region) => (
                  <li key={region.id}>
                    <button
                      type="button"
                      onClick={() => pick(region)}
                      className={
                        "block w-full px-3 py-2 text-left text-sm hover:bg-paper " +
                        (region.id === value?.id ? "bg-paper font-medium" : "")
                      }
                    >
                      {region.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </details>

      {error && (
        <p role="alert" className="text-xs text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
