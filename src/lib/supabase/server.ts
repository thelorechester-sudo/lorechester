import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireEnv } from "@/lib/env";

/**
 * Supabase client bound to the request's cookies. Use inside Server
 * Components, Server Actions and Route Handlers.
 *
 * `cookies()` is async in Next 16, so this is async too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. Harmless — proxy.ts
            // refreshes the session on every request.
          }
        },
      },
    },
  );
}

/*
 * There is deliberately no service-role client here.
 *
 * Nothing in this app needs to bypass Row Level Security: image uploads go
 * from the browser straight to Supabase Storage under the `media_admin_write`
 * policy, and every server-side read already runs as the `postgres` role over
 * the direct Drizzle connection. An unused RLS-bypassing client sitting in the
 * repo is only ever a liability — add one back if a real need appears, not
 * before.
 */
