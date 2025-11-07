// src/app/catalog/page.tsx
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchParams = {
  q?: string;
  page?: string;
  discipline?: string;
  gradeBand?: string;
  mediaType?: string;
  resourceType?: string;
  genre?: string;
  sort?: "newest" | "featured" | "relevance";
};

type Lookup = { key: string; label: string };
type Asset = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  discipline: string | null;
  grade_bands: string[] | null;
  resource_types: string[] | null;
  genres: string[] | null;
};
type AssetsResponse = {
  ok: boolean;
  data: Asset[];
  page: number;
  per: number;
  total: number;
  pageCount: number;
};

const asSort = (
  v: string | undefined
): "newest" | "featured" | "relevance" | undefined =>
  v === "newest" || v === "featured" || v === "relevance" ? v : undefined;

async function fetchAssets(search: SearchParams): Promise<AssetsResponse> {
  const qs = new URLSearchParams(
    Object.entries(search).filter(
      ([, v]) => v !== undefined && String(v).length > 0
    ) as [string, string][]
  );
  const base = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/assets?${qs.toString()}`, {
    cache: "no-store",
  });
  return (await res.json()) as AssetsResponse;
}

async function fetchLookups(): Promise<{
  disciplines: Lookup[];
  gradeBands: Lookup[];
  resourceTypes: Lookup[];
  genres: Lookup[];
}> {
  const supabase = await createClient();
  const [disciplines, gradeBands, resourceTypes, genres] = await Promise.all([
    supabase.from("disciplines").select("key,label").order("label"),
    supabase.from("grade_bands").select("key,label").order("min_grade"),
    supabase.from("resource_types").select("key,label").order("label"),
    supabase.from("genres").select("key,label").order("label"),
  ]);
  return {
    disciplines: (disciplines.data ?? []) as Lookup[],
    gradeBands: (gradeBands.data ?? []) as Lookup[],
    resourceTypes: (resourceTypes.data ?? []) as Lookup[],
    genres: (genres.data ?? []) as Lookup[],
  };
}

function buildUrl(
  nextParams: Record<string, string | number | undefined>,
  current: SearchParams
) {
  const sp = new URLSearchParams();
  const merged = { page: "1", sort: "newest", ...current, ...nextParams };
  Object.entries(merged).forEach(([k, v]) => {
    if (v !== undefined && String(v).length) sp.set(k, String(v));
  });
  return `/catalog?${sp.toString()}`;
}

// helper to coerce first value from Next 15's record
const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const spIn = await searchParams;
  const sp: SearchParams = {
    q: first(spIn.q),
    page: first(spIn.page),
    discipline: first(spIn.discipline),
    gradeBand: first(spIn.gradeBand),
    mediaType: first(spIn.mediaType),
    resourceType: first(spIn.resourceType),
    genre: first(spIn.genre),
    sort: asSort(first(spIn.sort)),
  };

  const page = Number(sp.page || "1");
  const sort = sp.sort ?? "newest";
  const [{ data, total, pageCount }, lookups] = await Promise.all([
    fetchAssets(sp),
    fetchLookups(),
  ]);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Catalog</h1>

      <form className="grid grid-cols-1 md:grid-cols-6 gap-3" action="/catalog">
        <Input
          name="q"
          placeholder="Search title or description…"
          defaultValue={sp.q || ""}
          className="md:col-span-2"
        />

        <select
          name="discipline"
          defaultValue={sp.discipline || ""}
          className="border rounded px-3 py-2"
        >
          <option value="">All disciplines</option>
          {lookups.disciplines.map((d: Lookup) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>

        <select
          name="gradeBand"
          defaultValue={sp.gradeBand || ""}
          className="border rounded px-3 py-2"
        >
          <option value="">All grade bands</option>
          {lookups.gradeBands.map((g: Lookup) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>

        <select
          name="resourceType"
          defaultValue={sp.resourceType || ""}
          className="border rounded px-3 py-2"
        >
          <option value="">All resource types</option>
          {lookups.resourceTypes.map((r: Lookup) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>

        <select
          name="genre"
          defaultValue={sp.genre || ""}
          className="border rounded px-3 py-2"
        >
          <option value="">All genres</option>
          {lookups.genres.map((g: Lookup) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>

        <div className="flex gap-2 items-center">
          <select
            name="sort"
            defaultValue={sort}
            className="border rounded px-3 py-2"
          >
            <option value="newest">Newest</option>
            <option value="featured">Featured</option>
            <option value="relevance">Relevance</option>
          </select>
          <Button type="submit">Apply</Button>
          <Link href="/catalog" className="underline">
            Reset
          </Link>
        </div>
      </form>

      <div className="text-sm text-muted-foreground">
        {total} result{total === 1 ? "" : "s"}
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((a: Asset) => (
          <Link key={a.id} href={`/asset/${a.id}`}>
            <Card className="p-3 hover:shadow-md transition">
              <div className="aspect-video bg-gray-100 rounded mb-3 overflow-hidden flex items-center justify-center">
                {a.thumbnail_url ? (
                  <Image
                    src={a.thumbnail_url}
                    alt={a.title}
                    width={640}
                    height={360}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-xs text-gray-500">No thumbnail</span>
                )}
              </div>
              <h3 className="font-medium">{a.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {a.description}
              </p>
              <div className="mt-2 text-xs text-gray-500">
                <span>{a.discipline}</span>
                {a.grade_bands?.length ? (
                  <span> • {a.grade_bands.join(", ")}</span>
                ) : null}
              </div>
            </Card>
          </Link>
        ))}
      </section>

      {pageCount > 1 && (
        <div className="flex justify-center items-center gap-4">
          <Link
            href={buildUrl({ page: Math.max(1, page - 1) }, sp)}
            className={`underline ${
              page <= 1 ? "pointer-events-none opacity-50" : ""
            }`}
          >
            ← Prev
          </Link>
          <span className="text-sm">
            Page {page} of {pageCount}
          </span>
          <Link
            href={buildUrl({ page: page + 1 }, sp)}
            className={`underline ${
              page >= pageCount ? "pointer-events-none opacity-50" : ""
            }`}
          >
            Next →
          </Link>
        </div>
      )}
    </main>
  );
}
