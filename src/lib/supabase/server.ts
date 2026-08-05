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

/**
 * Service-role client: bypasses Row Level Security.
 *
 * Only for server-side work the user is not allowed to do directly, such as
 * writing files to storage on their behalf. Never import this from a Client
 * Component and never derive the current user from it.
 */
export function createAdminClient() {
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
}
