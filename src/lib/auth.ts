import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import { profiles, type Profile } from "@/lib/db/schema";
import { DEMO_MODE } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  profile: Profile | null;
};

/**
 * The authenticated user for this request, or null.
 *
 * Uses `supabase.auth.getUser()`, which verifies the JWT against Supabase.
 * Never swap this for `getSession()` — that trusts the cookie as-is and can be
 * spoofed.
 *
 * `cache()` dedupes it across a single render pass, so calling it in a layout
 * and three server actions costs one round-trip.
 */
/**
 * Local-mode admin. There is no Supabase project to authenticate against, so
 * the back office is simply open — which is correct for a local preview and
 * catastrophic anywhere else. `DEMO_MODE` is driven by an env var that is not
 * set in production, and the guard below refuses to apply it if it somehow is.
 */
const LOCAL_ADMIN: CurrentUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "local@lorechester.test",
  profile: {
    userId: "00000000-0000-4000-8000-000000000001",
    email: "local@lorechester.test",
    fullName: "Local admin",
    phone: null,
    role: "admin",
    createdAt: new Date(0),
  },
};

const LOCAL_ADMIN_ENABLED = DEMO_MODE && process.env.NODE_ENV !== "production";

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (LOCAL_ADMIN_ENABLED) return LOCAL_ADMIN;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  return { id: user.id, email: user.email ?? "", profile: profile ?? null };
});

/**
 * THE authorization boundary for admin work.
 *
 * Call this at the top of every admin page AND every admin Server Action.
 * `proxy.ts` redirecting signed-out users is a convenience for browsers; a
 * Server Action invoked directly never passes through a route match, so
 * skipping this call here leaves the mutation wide open.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) redirect("/admin/login");
  if (user.profile?.role !== "admin") redirect("/admin/login?error=forbidden");

  return user;
}

/** True when the request comes from an admin. Does not redirect. */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.profile?.role === "admin";
}
