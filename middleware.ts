// middleware.ts (repo root)
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // 1) Screenshot bypass: skip auth checks entirely when SCREENSHOT_MODE=1
  // This is set by your screenshot script: `cross-env SCREENSHOT_MODE=1 ...`
  const isScreenshotMode = process.env.SCREENSHOT_MODE === "1";
  const path = req.nextUrl.pathname;
  const protectedPaths = ["/dashboard", "/collections"]; // keep in sync with your matcher
  const isProtected = protectedPaths.some(
    (p) => path === p || path.startsWith(p + "/")
  );

  if (isScreenshotMode && isProtected) {
    // Early exit: no Supabase call, no redirects
    return res;
  }

  // 2) Normal auth flow (only runs when not in screenshot mode)
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(url);
  }

  return res;
}

// 3) Match only the routes you actually protect
export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/collections",
    "/collections/:path*",
  ],
};
