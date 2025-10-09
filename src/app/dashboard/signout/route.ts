// src/app/dashboard/signout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";

async function handle(req: NextRequest) {
  const { supabase, res } = getRouteSupabase(req);

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[signout] supabase error:", error.message);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: res.headers }
    );
  }

  const wantsHtml = (req.headers.get("accept") ?? "").includes("text/html");
  if (wantsHtml) {
    // Force GET after sign-out to avoid POST /sign-in (405)
    return NextResponse.redirect(new URL("/sign-in", req.url), {
      status: 303,
      headers: res.headers, // propagate Set-Cookie from Supabase
    });
  }

  return NextResponse.json({ ok: true }, { headers: res.headers });
}

export { handle as POST, handle as GET };
export const dynamic = "force-dynamic"; // this is needed to make sure the cookies are set properly
export const revalidate = 0; // this is needed to make sure the cookies are set properly
