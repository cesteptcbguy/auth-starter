// middleware.ts (final clean version)
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export default async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // --- Early exit for static assets and Next internals ---
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(css|js|map|ico|png|jpg|jpeg|gif|webp|svg|ttf|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  // Local-only screenshot bypass
  const hostname = url.hostname;
  const isScreenshotMode =
    process.env.SCREENSHOT_MODE === "1" ||
    process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1";
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  if (isScreenshotMode && isLocalhost) return res;

  // Guard only dashboard
  const protectedPaths = ["/dashboard", "/profile"];
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  const SUPA_URL =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPA_KEY =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isProtected && (!SUPA_URL || !SUPA_KEY)) {
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("redirectTo", pathname + (url.search || ""));
    return NextResponse.redirect(signInUrl, 303);
  }

  let user: { id: string } | null = null;

  try {
    if (SUPA_URL && SUPA_KEY) {
      const supabase = createServerClient(SUPA_URL, SUPA_KEY, {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(
            cookies: { name: string; value: string; options: CookieOptions }[]
          ) {
            cookies.forEach(({ name, value, options }) =>
              res.cookies.set({ name, value, ...options })
            );
          },
        },
      });

      const { data, error } = await supabase.auth.getUser();
      if (!error) user = data.user ?? null;
    }
  } catch (e) {
    console.error("[middleware] unexpected error:", e);
  }

  const copyCookies = (response: NextResponse) => {
    res.cookies.getAll().forEach((c) => response.cookies.set(c));
    return response;
  };

  // Redirect unauthenticated users away from protected pages
  if (!user && isProtected) {
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("redirectTo", pathname + (url.search || ""));
    return copyCookies(NextResponse.redirect(signInUrl, 303));
  }

  // Redirect authenticated users away from public entry points
  if (user && (pathname === "/" || pathname === "/sign-in")) {
    return copyCookies(
      NextResponse.redirect(new URL("/dashboard", url.origin), 303)
    );
  }

  return res;
}

// ✅ Matcher that only runs middleware on actual app pages
export const config = {
  matcher: ["/", "/sign-in", "/dashboard/:path*"],
};
