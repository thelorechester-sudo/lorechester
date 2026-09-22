import { formatIDR } from "@/lib/money";

/**
 * Scrolling ticker. Duplicated content is marked aria-hidden so a screen
 * reader announces the message once instead of twice, and the animation is
 * cancelled by the global prefers-reduced-motion rule in globals.css.
 */
export function AnnouncementBar({
  freeShippingThreshold,
  messages: custom,
}: {
  freeShippingThreshold: number;
  /** Admin-editable lines. The shipping line is always prepended. */
  messages: string[];
}) {
  const messages = [
    freeShippingThreshold > 0
      ? `Free shipping over ${formatIDR(freeShippingThreshold)}`
      : "Shipped nationwide",
    ...custom,
  ];

  const strip = messages.join("  ✳  ");

  return (
    <div className="overflow-hidden bg-accent py-2 text-paper">
      <div className="flex w-max animate-[ticker_38s_linear_infinite] gap-8 whitespace-nowrap">
        <span className="meta">{strip}</span>
        <span className="meta" aria-hidden>
          {strip}
        </span>
        <span className="meta" aria-hidden>
          {strip}
        </span>
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-33.333%) } }`}</style>
    </div>
  );
}
