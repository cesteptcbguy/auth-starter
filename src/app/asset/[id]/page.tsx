// src/app/asset/[id]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import AddToCollection from "./_add-to-collection";

type Asset = {
  id: number;
  title: string;
  description: string | null;
  discipline: string | null;
  grade_bands: string[] | null;
  resource_types: string[] | null;
  genres: string[] | null;
  media_type: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

export default async function AssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: asset, error } = await supabase
    .from("assets")
    .select(
      "id, title, description, discipline, grade_bands, resource_types, genres, media_type, thumbnail_url, created_at"
    )
    .eq("id", Number(id))
    .eq("status", "PUBLISHED")
    .single<Asset>();

  if (error || !asset) return notFound();

  return (
    <main className="p-6 space-y-6">
      <Link href="/catalog" className="underline text-sm">
        ← Back to catalog
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-4 lg:col-span-2">
          <h1 className="text-2xl font-semibold mb-2">{asset.title}</h1>
          <p className="text-muted-foreground mb-4">{asset.description}</p>

          <div className="aspect-video bg-gray-100 rounded overflow-hidden flex items-center justify-center">
            {asset.thumbnail_url ? (
              <Image
                src={asset.thumbnail_url}
                alt={asset.title}
                width={1280}
                height={720}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-xs text-gray-500">No thumbnail</span>
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-medium">Details</h2>
          <div className="text-sm">
            <span className="font-medium">Discipline:</span> {asset.discipline}
          </div>
          {asset.grade_bands?.length ? (
            <div className="text-sm">
              <span className="font-medium">Grade bands:</span>{" "}
              {asset.grade_bands.join(", ")}
            </div>
          ) : null}
          {asset.resource_types?.length ? (
            <div className="text-sm">
              <span className="font-medium">Resource types:</span>{" "}
              {asset.resource_types.join(", ")}
            </div>
          ) : null}
          {asset.genres?.length ? (
            <div className="text-sm">
              <span className="font-medium">Genres:</span>{" "}
              {asset.genres.join(", ")}
            </div>
          ) : null}
          <div className="text-xs text-gray-500">ID: {asset.id}</div>

          <div className="pt-2">
            <AddToCollection assetId={asset.id} />
          </div>
        </Card>
      </div>
    </main>
  );
}
