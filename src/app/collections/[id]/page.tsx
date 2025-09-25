// src/app/collections/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import RemoveBtn from "./_remove";

export default async function CollectionDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const supabase = createClient();

  const { data: collection } = await supabase.from("collections").select("id,name").eq("id", id).single();
  if (!collection) return (<main className="p-6">Not found</main>);

  const { data: items } = await supabase
    .from("collection_items")
    .select("asset_id, position, assets ( id, title, thumbnail_url, description )")
    .eq("collection_id", id)
    .order("position", { ascending: true });

  return (
    <main className="p-6 space-y-6">
      <Link href="/collections" className="underline text-sm">← Back to collections</Link>
      <h1 className="text-2xl font-semibold">{collection.name}</h1>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items?.map((it: any) => (
          <Card key={it.asset_id} className="p-3">
            <Link href={`/asset/${it.assets.id}`}>
              <div className="aspect-video rounded bg-gray-100 mb-3 overflow-hidden flex items-center justify-center">
                {it.assets.thumbnail_url ? (
                  <Image src={it.assets.thumbnail_url} alt={it.assets.title} width={640} height={360} className="object-cover w-full h-full" />
                ) : <span className="text-xs text-gray-500">No thumbnail</span>}
              </div>
              <h3 className="font-medium">{it.assets.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{it.assets.description}</p>
            </Link>
            <div className="mt-2">
              <RemoveBtn collectionId={id} assetId={it.asset_id} />
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}


