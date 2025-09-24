// middleware.ts (repo root)
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
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

  const { data: { user } } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const protectedPaths = ["/dashboard"]; // add more like "/collections", "/admin"
  const isProtected = protectedPaths.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && isProtected) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard"], // add more matchers as you protect more areas
};
