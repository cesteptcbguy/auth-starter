// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assertEnv(
  name: string,
  value: string | undefined
): asserts value is string {
  if (!value) {
    throw new Error(
      `[supabase] Missing env ${name}. Set it in Vercel for ${
        process.env.VERCEL_ENV ?? "local"
      } environment.`
    );
  }
}

export async function getServerSupabase(): Promise<SupabaseClient> {
  // Ensure vars exist at runtime (useful in Preview/Prod)
  assertEnv("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  assertEnv(
    "SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    SUPABASE_ANON_KEY
  );

  // Next 15: cookies() is async and read-only in Server Components
  const store = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      // no set/remove in Server Components
    },
  });
}
