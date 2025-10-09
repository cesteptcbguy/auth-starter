// src/app/api/collections/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";

export async function GET(req: NextRequest) {
  const { supabase, res } = getRouteSupabase(req);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "auth" },
      { status: 401, headers: res.headers }
    );
  }

  const { data, error } = await supabase
    .from("collections")
    .select("id,name,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: res.headers }
    );
  }

  return NextResponse.json({ ok: true, data }, { headers: res.headers });
}

export async function POST(req: NextRequest) {
  const { supabase, res } = getRouteSupabase(req);
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name;

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "name required" },
      { status: 400, headers: res.headers }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "auth" },
      { status: 401, headers: res.headers }
    );
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({ owner_user_id: user.id, name })
    .select("id,name,created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: res.headers }
    );
  }

  return NextResponse.json({ ok: true, data }, { headers: res.headers });
}
