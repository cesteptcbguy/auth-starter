// src/app/api/collections/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const body = await _req.json().catch(() => ({}));
  const name = body?.name as string | undefined;
  if (!name) return NextResponse.json({ ok:false, error:"name required" }, { status:400 });

  const supabase = createClient();
  const { error } = await supabase
    .from("collections")
    .update({ name })
    .eq("id", Number(params.id));

  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { error } = await supabase.from("collections").delete().eq("id", Number(params.id));
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}
