import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { missingStoreEnv } from "@/lib/env";

/**
 * Runs before every matched request (Next 16 renamed Middleware to Proxy).
 *
 * Two jobs, both cheap:
 *   1. Refresh the Supabase session cookie so Server Components see a live user.
 *   2. Bounce signed-out visitors away from /admin.
 *
 * (2) is an *optimistic* check for humans, not an authorization boundary — it
 * only inspects a cookie. Every admin page and Server Action independently
 * calls `requireAdmin()` from `@/lib/auth`, which is what actually enforces
 * access. Deleting that call is not made safe by this file.
 */
export async function proxy(request: NextRequest) {
  /*
   * Local mode has no Supabase project, so there is no session to refresh and
   * no cookie to inspect. Gated on NODE_ENV as well as the flag: `requireAdmin`
   * is the real boundary and is gated the same way, but an env var must never
   * be able to switch off the /admin redirect in a deployed build.
   */
  if (
    process.env.NEXT_PUBLIC_DEMO_MODE === "1" &&
    process.env.NODE_ENV !== "production"
  ) {
    return NextResponse.next({ request });
  }

  /*
   * No database configured — show the setup page instead of crashing.
   *
   * This used to construct a Supabase client from two non-null assertions, so
   * an unconfigured deploy threw here, in middleware, before any route ran.
   * Every page returned a bare "Internal Server Error" with nothing to act on.
   *
   * Rewriting is what makes this reliable: a check inside a layout does not
   * stop the page beneath it rendering (they run in parallel) and its query
   * would still throw.
   */
  const { pathname } = request.nextUrl;

  if (missingStoreEnv().length > 0 && pathname !== "/setup") {
    return NextResponse.rewrite(new URL("/setup", request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /*
   * /setup is excluded from the rewrite above, so it is the one path that
   * reaches here while unconfigured — and without this guard it built a client
   * from two undefined values and threw. The page whose entire job is to
   * explain a missing configuration was the only page that 500ed on one.
   *
   * Keep the guard even though the rewrite "should" make it unreachable:
   * this line has taken production down twice.
   */
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not remove: this call is what refreshes an expired token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/admin/login") {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    adminUrl.search = "";
    return NextResponse.redirect(adminUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — matching those would
     * add a Supabase round-trip to every icon request.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
