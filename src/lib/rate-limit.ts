import "server-only";

import { headers } from "next/headers";

/**
 * Sliding-window rate limit for unauthenticated Server Actions.
 *
 * ponytail: in-memory, so the window is per serverless instance rather than
 * global. That still stops the realistic case — a script hammering the same
 * endpoint keeps hitting a warm instance — and costs nothing. Move to Upstash
 * Redis (or Vercel Firewall rules) if you ever need a limit that actually
 * holds across the fleet.
 *
 * Nothing here is persisted, and the caller keys on a hash, so no IP address
 * is ever stored.
 */

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

/** Stop the map growing without bound on a long-lived instance. */
function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return { ok: true, retryAfterSeconds: 0 };
}

/**
 * A coarse, non-identifying client key.
 *
 * Uses the left-most x-forwarded-for entry (the original client as far as the
 * proxy is concerned). Falls back to a shared bucket when absent, which is
 * deliberately conservative: unknown callers share one allowance.
 */
export async function clientKey(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || store.get("x-real-ip");
  return ip || "unknown";
}
