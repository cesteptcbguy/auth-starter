import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

  const { data, error } = await supabase
    .from("collections")
    .select("id,name,created_at")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  if (!name)
    return NextResponse.json(
      { ok: false, error: "name required" },
      { status: 400 }
    );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

  const { data, error } = await supabase
    .from("collections")
    .insert({ owner_user_id: user.id, name })
    .select("id,name,created_at")
    .single();

  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  return NextResponse.json({ ok: true, data });
}
