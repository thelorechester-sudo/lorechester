import type { Metadata } from "next";

import { SetupRequired } from "@/components/setup-required";
import { isLocalDatabase, missingStoreEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Setup required",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Where `proxy.ts` rewrites every request when the app has no database.
 *
 * It has to be its own route rather than a check inside the store layout:
 * layouts and pages render in parallel, so an early return from the layout
 * does not stop the page underneath from running its queries and throwing.
 * Rewriting in middleware is the only place that reliably short-circuits.
 */
export default function SetupPage() {
  const missing = isLocalDatabase() ? [] : missingStoreEnv();
  return <SetupRequired missing={missing} />;
}
