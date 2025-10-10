// middleware.ts (repo root)
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const REDIRECT_COOKIE = "bb_redirect_to";
const REDIRECT_COOKIE_MAX_AGE = 60 * 5; // 5 minutes

export default async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const url = new URL(req.url);
  const hostname = url.hostname;
  let pathname = url.pathname.replace(/\/+$/, "") || "/";
  const search = url.search;

  // Local-only screenshot bypass
  const isScreenshotMode =
    process.env.SCREENSHOT_MODE === "1" ||
    process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1";
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  if (isScreenshotMode && isLocalhost) {
    return res;
  }

  // Only guard protected paths
  const protectedPaths = ["/dashboard", "/collections", "/catalog"];
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  const SUPA_URL =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPA_KEY =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If protected and Supabase envs are missing, force sign-in redirect
  if (isProtected && (!SUPA_URL || !SUPA_KEY)) {
    const target = `${pathname}${search || ""}`;
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("redirectTo", target);
    return NextResponse.redirect(signInUrl, 303);
  }

  let user: { id: string } | null = null;

  try {
    if (SUPA_URL && SUPA_KEY) {
      const supabase = createServerClient(SUPA_URL, SUPA_KEY, {
        // In Next.js Middleware, @supabase/ssr expects getAll/setAll
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(
            cookies: { name: string; value: string; options: CookieOptions }[]
          ) {
            cookies.forEach(({ name, value, options }) => {
              res.cookies.set({ name, value, ...options });
            });
          },
        },
      });

      const { data, error } = await supabase.auth.getUser();
      if (!error) user = data.user ?? null;
      else if (!/refresh token not found/i.test(error.message)) {
        console.warn("[middleware] auth.getUser error:", error.message);
      }
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
    const target = `${pathname}${search || ""}`;
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("redirectTo", target);

    res.cookies.set({
      name: REDIRECT_COOKIE,
      value: encodeURIComponent(target),
      httpOnly: true,
      sameSite: "lax",
      maxAge: REDIRECT_COOKIE_MAX_AGE,
      path: "/",
    });

    return copyCookies(NextResponse.redirect(signInUrl, 303));
  }

  // Redirect authenticated users away from public entry points
  if (
    user &&
    (pathname === "/" || pathname === "/sign-in" || pathname === "/sign-up")
  ) {
    res.cookies.set({ name: REDIRECT_COOKIE, value: "", path: "/", maxAge: 0 });
    return copyCookies(
      NextResponse.redirect(new URL("/dashboard", url.origin), 303)
    );
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|ttf|woff|woff2)).*)",
  ],
};
