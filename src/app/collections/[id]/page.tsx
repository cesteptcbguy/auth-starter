// src/app/collections/[id]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Image from "next/image";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import RemoveBtn from "./_remove";

type AssetLite = {
  id: number;
  title: string;
  thumbnail_url: string | null;
  description: string | null;
};

type ItemRow = {
  asset_id: number;
  position: number;
  assets: AssetLite;
};

type Collection = {
  id: number;
  name: string;
};

type RawItem = {
  asset_id: number;
  position: number;
  assets: AssetLite | AssetLite[];
};

export default async function CollectionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // Next 15: params is a Promise
  const collectionId = Number(id);

  const supabase = await getServerSupabase();

  const { data: collection } = await supabase
    .from("collections")
    .select("id,name")
    .eq("id", collectionId)
    .single<Collection>();

  if (!collection) {
    return (
      <main className="p-6">
        <p>Collection not found.</p>
        <Link className="underline" href="/collections">
          Back to collections
        </Link>
      </main>
    );
  }

  // Fetch items with joined assets
  const { data: itemsRaw } = await supabase
    .from("collection_items")
    .select(
      "asset_id, position, assets ( id, title, thumbnail_url, description )"
    )
    .eq("collection_id", collectionId)
    .order("position", { ascending: true });

  const raw: RawItem[] = (itemsRaw ?? []) as RawItem[];
  const items: ItemRow[] = raw.map((r) => ({
    asset_id: r.asset_id,
    position: r.position,
    assets: Array.isArray(r.assets) ? r.assets[0] : r.assets,
  }));

  return (
    <main className="p-6 space-y-6">
      <Link href="/collections" className="underline text-sm">
        ← Back to collections
      </Link>

      <h1 className="text-2xl font-semibold">{collection.name}</h1>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No items yet. Add one from an asset page.
        </p>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <Card key={it.asset_id} className="p-3">
              <Link href={`/asset/${it.assets.id}`}>
                <div className="aspect-video rounded bg-gray-100 mb-3 overflow-hidden flex items-center justify-center">
                  {it.assets.thumbnail_url ? (
                    <Image
                      src={it.assets.thumbnail_url}
                      alt={it.assets.title}
                      width={640}
                      height={360}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-xs text-gray-500">No thumbnail</span>
                  )}
                </div>
                <h3 className="font-medium">{it.assets.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {it.assets.description}
                </p>
              </Link>

              <div className="mt-2">
                <RemoveBtn collectionId={collectionId} assetId={it.asset_id} />
              </div>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
