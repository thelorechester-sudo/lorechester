"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Reopen the Snap popup for an order that was left unpaid. */
export function PayNowButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => {
          if (!window.snap) {
            setError(
              "The payment window couldn't load. Disable your ad blocker and refresh, or message us to pay another way.",
            );
            return;
          }
          window.snap.pay(token, {
            onSuccess: () => router.refresh(),
            onPending: () => router.refresh(),
            onClose: () => router.refresh(),
          });
        }}
        className="flex h-12 w-full items-center justify-center rounded-button bg-ink text-paper transition-colors hover:bg-ink-soft"
      >
        <span className="meta">Pay now</span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
