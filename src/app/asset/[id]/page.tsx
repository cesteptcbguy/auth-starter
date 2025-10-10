// src/app/asset/[id]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";
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

type Membership = {
  collectionId: number;
  name: string | null;
};

export default async function AssetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params; // Next 15: params is a Promise
  const search = await searchParams;
  const rawFrom = Array.isArray(search.from) ? search.from[0] : search.from;
  const fromParam =
    typeof rawFrom === "string" &&
    rawFrom.startsWith("/") &&
    !rawFrom.startsWith("//")
      ? rawFrom
      : null;
  const rawLabel = Array.isArray(search.fromLabel)
    ? search.fromLabel[0]
    : search.fromLabel;
  const fromLabel =
    typeof rawLabel === "string" && rawLabel.trim().length
      ? rawLabel.trim()
      : null;
  const backHref = fromParam ?? "/dashboard";
  let backText: string;
  if (fromLabel) {
    backText = `Back to ${fromLabel}`;
  } else if (fromParam?.startsWith("/collections/")) {
    backText = "Back to collection";
  } else if (fromParam?.startsWith("/catalog")) {
    backText = "Back to catalog";
  } else if (fromParam?.startsWith("/dashboard")) {
    backText = "Back to dashboard";
  } else {
    backText = "Back to dashboard";
  }

  const supabase = await getServerSupabase();
  const numericId = Number(id);

  const { data: asset, error } = await supabase
    .from("assets")
    .select(
      "id, title, description, discipline, grade_bands, resource_types, genres, media_type, thumbnail_url, created_at"
    )
    .eq("id", numericId)
    .eq("status", "PUBLISHED")
    .single<Asset>();

  if (error || !asset) return notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let memberships: Membership[] = [];

  if (user) {
    const { data: membershipData, error: membershipError } = await supabase
      .from("collections")
      .select("id,name,collection_items!inner(asset_id)")
      .eq("owner_user_id", user.id)
      .eq("collection_items.asset_id", numericId);

    if (!membershipError && membershipData) {
      memberships = (membershipData as { id: number; name: string | null }[]).map(
        (row) => ({
          collectionId: row.id,
          name: row.name,
        })
      );
    }
  }

  return (
    <main className="p-6 space-y-6">
      <Link href={backHref} className="underline text-sm">
        ← {backText}
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
            <AddToCollection
              assetId={asset.id}
              initialMemberships={memberships}
              isAuthenticated={Boolean(user)}
            />
          </div>
        </Card>
      </div>
    </main>
  );
}
