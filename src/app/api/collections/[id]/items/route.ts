import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { assetId } = (await req.json().catch(() => ({}))) as {
    assetId?: number;
  };
  if (!assetId)
    return NextResponse.json(
      { ok: false, error: "assetId required" },
      { status: 400 }
    );

  const collectionId = Number(id);
  const { supabase, res } = getRouteSupabase(req);

  // find next position
  const { data: posData } = await supabase
    .from("collection_items")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPos = (posData?.position ?? 0) + 1;

  const { error } = await supabase
    .from("collection_items")
    .insert({
      collection_id: collectionId,
      asset_id: Number(assetId),
      position: nextPos,
    })
    .select("id")
    .single();

  // allow duplicates to be no-ops
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true }, { headers: res.headers });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const assetId = url.searchParams.get("assetId");
  if (!assetId)
    return NextResponse.json(
      { ok: false, error: "assetId required" },
      { status: 400 }
    );

  const { supabase, res } = getRouteSupabase(req);
  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", Number(id))
    .eq("asset_id", Number(assetId));

  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  return NextResponse.json({ ok: true }, { headers: res.headers });
}
