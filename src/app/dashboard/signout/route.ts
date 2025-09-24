import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(
    new URL("/sign-in", process.env.WEB_BASE_URL || "http://localhost:3000")
  );
}
