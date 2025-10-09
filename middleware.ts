// middleware.ts (repo root)
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const REDIRECT_COOKIE = "bb_redirect_to";
const REDIRECT_COOKIE_MAX_AGE = 60 * 5; // 5 minutes

export default async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const isScreenshotMode =
    process.env.SCREENSHOT_MODE === "1" ||
    process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1";

  const SUPA_URL =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPA_KEY =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const url = new URL(req.url);
  const { pathname, search } = url;
  const protectedPaths = ["/dashboard", "/collections"];
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isScreenshotMode) return res;
  if (!SUPA_URL || !SUPA_KEY) {
    console.warn("[middleware] Missing Supabase env; skipping auth guard");
    return res;
  }

  let user: { id: string } | null = null;
  try {
    const supabase = createServerClient(SUPA_URL, SUPA_KEY, {
      // In Next.js MIDDLEWARE, @supabase/ssr expects getAll/setAll
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
    if (error) {
      if (!/refresh token not found/i.test(error.message)) {
        console.warn("[middleware] auth.getUser error:", error.message);
      }
    } else {
      user = data.user ?? null;
    }
  } catch (e) {
    console.error("[middleware] unexpected error:", e);
  }

  const copyCookies = (response: NextResponse) => {
    res.cookies.getAll().forEach((c) => response.cookies.set(c));
    return response;
  };

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

  if (user && (pathname === "/" || pathname === "/sign-in")) {
    res.cookies.set({ name: REDIRECT_COOKIE, value: "", path: "/", maxAge: 0 });
    return copyCookies(
      NextResponse.redirect(new URL("/dashboard", url.origin), 303)
    );
  }

  return res;
}

export const config = {
  matcher: [
    "/",
    "/sign-in",
    "/dashboard",
    "/dashboard/:path*",
    "/collections",
    "/collections/:path*",
  ],
};
