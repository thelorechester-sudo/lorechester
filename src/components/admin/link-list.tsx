"use client";

import { Button, Input } from "@/components/admin/ui";
import type { SiteLink } from "@/lib/site";

/**
 * Editable list of { name, address } links with up / down / remove. Buttons
 * rather than drag-and-drop: far less code, and keyboard friendly.
 */
export function LinkList({
  idPrefix,
  links,
  onChange,
  max = 8,
  errors = {},
}: {
  idPrefix: string;
  links: SiteLink[];
  onChange: (next: SiteLink[]) => void;
  max?: number;
  /** Zod issues keyed "<index>.label" / "<index>.href". */
  errors?: Record<string, string>;
}) {
  const update = (index: number, patch: Partial<SiteLink>) =>
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {links.length === 0 && (
        <p className="text-xs text-muted">No links yet.</p>
      )}

      {links.map((link, index) => (
        <div key={index} className="space-y-1">
          <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <Input
              aria-label={`Link ${index + 1} name`}
              id={`${idPrefix}-label-${index}`}
              value={link.label}
              placeholder="Name"
              onChange={(e) => update(index, { label: e.target.value })}
            />
            <Input
              aria-label={`Link ${index + 1} address`}
              id={`${idPrefix}-href-${index}`}
              value={link.href}
              placeholder="/shop or https://…"
              onChange={(e) => update(index, { href: e.target.value })}
            />
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Move link ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Move link ${index + 1} down`}
                disabled={index === links.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove link ${index + 1}`}
                onClick={() => onChange(links.filter((_, i) => i !== index))}
              >
                ✕
              </Button>
            </div>
          </div>
          {(errors[`${index}.label`] || errors[`${index}.href`]) && (
            <p role="alert" className="text-xs text-accent">
              {errors[`${index}.label`] ?? errors[`${index}.href`]}
            </p>
          )}
        </div>
      ))}

      {links.length < max && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...links, { label: "", href: "" }])}
        >
          Add link
        </Button>
      )}
    </div>
  );
}
