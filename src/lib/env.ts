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
