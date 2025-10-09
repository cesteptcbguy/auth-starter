// src/app/collections/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import CreateCollection from "./_create";

export default async function CollectionsPage() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="p-6">
        <Link className="underline" href="/sign-in">
          Sign in
        </Link>
      </main>
    );
  }

  const { data } = await supabase
    .from("collections")
    .select("id,name,created_at")
    .order("created_at", { ascending: false });

  // (optional) handle error state
  // if (error) return <main className="p-6">Failed to load collections.</main>;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">My Collections</h1>
      <CreateCollection />
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((c) => (
          <Link key={c.id} href={`/collections/${c.id}`}>
            <Card className="p-4 hover:shadow-md transition">
              <h3 className="font-medium">{c.name}</h3>
              <div className="text-xs text-gray-500">#{c.id}</div>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
