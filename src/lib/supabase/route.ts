// src/lib/supabase/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Route-handler-safe Supabase server client.
 * We attach Set-Cookie on a blank NextResponse() (not NextResponse.next()).
 * Callers must copy res.headers onto the response they return.
 */
export function getRouteSupabase(req: NextRequest) {
  // blank response used only to collect Set-Cookie
  const res = new NextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  return { supabase, res };
}
