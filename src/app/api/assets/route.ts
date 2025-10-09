// src/app/api/assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";

type Sort = "newest" | "featured" | "relevance";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const per = Math.min(
    48,
    Math.max(1, Number(url.searchParams.get("per") || "12"))
  );
  const q = (url.searchParams.get("q") || "").trim();
  const discipline = url.searchParams.get("discipline") || "";
  const gradeBand = url.searchParams.get("gradeBand") || "";
  const mediaType = url.searchParams.get("mediaType") || "";
  const resourceType = url.searchParams.get("resourceType") || "";
  const genre = url.searchParams.get("genre") || "";
  const sort = (url.searchParams.get("sort") as Sort) || "newest";

  const from = (page - 1) * per;
  const to = from + per - 1;

  const { supabase, res } = getRouteSupabase(req);

  let query = supabase
    .from("assets")
    .select(
      "id, title, description, thumbnail_url, discipline, grade_bands, resource_types, genres, media_type, featured, featured_rank, created_at",
      { count: "exact" }
    )
    // RLS already limits to PUBLISHED for anon; keep explicit filter:
    .eq("status", "PUBLISHED");

  // Search
  if (q) {
    const like = `%${q}%`;
    query = query.or(`title.ilike.${like},description.ilike.${like}`);
  }

  // Facets
  if (discipline) query = query.eq("discipline", discipline);
  if (gradeBand) query = query.contains("grade_bands", [gradeBand]);
  if (mediaType) query = query.eq("media_type", mediaType);
  if (resourceType) query = query.contains("resource_types", [resourceType]);
  if (genre) query = query.contains("genres", [genre]);

  // Sort
  if (sort === "featured") {
    query = query
      .order("featured", { ascending: false })
      .order("featured_rank", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else {
    // newest or relevance (fallback = newest)
    query = query.order("created_at", { ascending: false });
  }

  // Pagination
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: res.headers }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: data ?? [],
      page,
      per,
      total: count ?? 0,
      pageCount: count ? Math.ceil(count / per) : 0,
    },
    { headers: res.headers }
  );
}
