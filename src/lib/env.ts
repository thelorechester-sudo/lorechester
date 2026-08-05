/**
 * Read a required server-side environment variable.
 *
 * Deliberately lazy: it throws at the call site rather than at import time, so
 * a missing Midtrans key breaks checkout with a clear message instead of
 * refusing to boot the whole app while you're still building the storefront.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. Add it to .env.local (see .env.example).`,
    );
  }
  return value;
}

/** Non-throwing variant for genuinely optional integrations. */
export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

/**
 * The variables without which the app cannot serve a page at all.
 *
 * Everything else (Midtrans, Biteship, Fonnte, Resend, analytics) degrades
 * gracefully, so it is deliberately not listed here.
 *
 * Note these are read as literal `process.env.X` rather than through a loop:
 * `NEXT_PUBLIC_*` values are substituted at build time, and only a static
 * member expression gets substituted.
 */
export function missingStoreEnv(): string[] {
  const required: [string, string | undefined][] = [
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
    ["DATABASE_URL", process.env.DATABASE_URL],
  ];

  return required.filter(([, value]) => !value).map(([name]) => name);
}

/**
 * True when the local PGlite database is standing in for Supabase, in which
 * case none of the above is required.
 */
export function isLocalDatabase(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === "1" &&
    process.env.NODE_ENV !== "production"
  );
}

/** Absolute origin, needed for Midtrans callbacks and OG image URLs. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

export const isProduction = process.env.NODE_ENV === "production";
