// middleware.ts (repo root)
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const REDIRECT_COOKIE = "bb_redirect_to";
const REDIRECT_COOKIE_MAX_AGE = 60 * 5; // 5 minutes

export default async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const isScreenshotMode =
    process.env.SCREENSHOT_MODE === "1" ||
    process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1";

  const url = new URL(req.url);
  const { pathname, search } = url;
  const protectedPaths = ["/dashboard", "/collections"];
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isScreenshotMode) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  let user = null;
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
  } catch (error) {
    console.warn("[middleware] supabase auth.getUser failed", error);
  }

  const copyCookies = (response: NextResponse) => {
    res.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
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

    const redirectResponse = NextResponse.redirect(signInUrl);
    return copyCookies(redirectResponse);
  }

  if (user && (pathname === "/" || pathname === "/sign-in")) {
    res.cookies.set({ name: REDIRECT_COOKIE, value: "", path: "/", maxAge: 0 });
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", url.origin));
    return copyCookies(redirectResponse);
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
