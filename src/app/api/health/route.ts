import { NextResponse } from "next/server";

export async function GET() {
  const ok =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !!process.env.STRIPE_SECRET_KEY;
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}
