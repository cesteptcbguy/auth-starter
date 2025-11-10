// app/api/health/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // or "edge" if you prefer; keep it tiny either way
export const dynamic = "force-dynamic"; // avoid static caching

export async function GET() {
  const body = {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    // optional build info if you pass these in env:
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.COMMIT_SHA ?? null,
  };

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
