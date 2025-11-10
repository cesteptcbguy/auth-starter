// app/api/ready/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Basic config check
  if (!url || !key) {
    return NextResponse.json(
      { status: "error", reason: "missing_supabase_env" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  // Optional lightweight external ping with a tiny timeout
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1000); // 1s
    // A HEAD to the REST endpoint root is cheap; we just want reachability
    const resp = await fetch(`${url}/rest/v1/`, {
      method: "HEAD",
      headers: { apikey: key },
      signal: controller.signal,
    });
    clearTimeout(t);

    if (!resp.ok && resp.status !== 404) {
      // 404 is fine for the root; other statuses suggest trouble
      return NextResponse.json(
        { status: "error", reason: "supabase_unreachable", code: resp.status },
        { status: 503, headers: { "cache-control": "no-store" } }
      );
    }
  } catch (e) {
    // Optional: surface for debugging without failing lint
    console.debug("ready check error:", e);
    return NextResponse.json(
      { status: "error", reason: "supabase_timeout_or_network" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  return NextResponse.json(
    { status: "ready" },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
