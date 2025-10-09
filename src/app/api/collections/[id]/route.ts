// src/app/api/collections/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Next 15: params is a Promise

  const { supabase, res } = getRouteSupabase(req);

  // auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "auth" },
      { status: 401, headers: res.headers }
    );
  }

  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", user.id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: res.headers }
    );
  }

  return NextResponse.json({ ok: true }, { headers: res.headers });
}
