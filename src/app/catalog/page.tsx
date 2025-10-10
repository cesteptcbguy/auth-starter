// src/app/catalog/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import Image from "next/image";
import { getServerSupabase } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchParams = {
  q?: string;
  page?: string;
  per?: string; // <-- add this
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

const formatTaxonomyLabel = (value: string | null | undefined) => {
  if (!value) return "";
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => {
      const lower = segment.toLowerCase();
      if (lower.length === 0) return segment;
      return lower.replace(/^\w/, (char) => char.toUpperCase());
    })
    .join(" ");
};

function PlaceholderThumbnail({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-100 text-gray-400">
      <svg
        aria-hidden="true"
        className="h-8 w-8"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <path d="m3 16 5-5 4 4 5-5 4 4" />
        <circle cx="8.5" cy="8.5" r="1.5" />
      </svg>
      <span className="text-xs font-medium">{title.slice(0, 40) || "Preview unavailable"}</span>
    </div>
  );
}

type FilterKey = "discipline" | "gradeBand" | "resourceType" | "genre";

function FilterChip({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      role="button"
      aria-pressed={isActive}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 ${
        isActive
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}

function FilterChipGroup({
  label,
  options,
  currentValue,
  buildUrl,
  paramKey,
}: {
  label: string;
  options: Lookup[];
  currentValue?: string;
  buildUrl: (
    nextParams: Partial<Record<FilterKey | "page", string | undefined>>
  ) => string;
  paramKey: FilterKey;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
      <div className="flex flex-wrap gap-2">
        <FilterChip
          href={buildUrl({ [paramKey]: undefined })}
          label="All"
          isActive={!currentValue}
        />
        {options.map((option) => {
          const value = option.key;
          const isActive = currentValue === value;
          return (
            <FilterChip
              key={value}
              href={buildUrl({
                [paramKey]: isActive ? undefined : value,
              })}
              label={formatTaxonomyLabel(option.label)}
              isActive={isActive}
            />
          );
        })}
      </div>
    </div>
  );
}

async function fetchAssets(search: SearchParams): Promise<AssetsResponse> {
  const supabase = await getServerSupabase();

  const page = Math.max(1, Number(search.page ?? "1"));
  const per = Math.min(48, Math.max(1, Number(search.per ?? "12"))); // <-- no any
  const from = (page - 1) * per;
  const to = from + per - 1;

  let query = supabase
    .from("assets")
    .select(
      "id, title, description, thumbnail_url, discipline, grade_bands, resource_types, genres, media_type, featured, featured_rank, created_at",
      { count: "exact" }
    )
    .eq("status", "PUBLISHED");

  const q = (search.q ?? "").trim();
  if (q) {
    const like = `%${q}%`;
    query = query.or(`title.ilike.${like},description.ilike.${like}`);
  }

  if (search.discipline) query = query.eq("discipline", search.discipline);
  if (search.gradeBand)
    query = query.contains("grade_bands", [search.gradeBand]);
  if (search.mediaType) query = query.eq("media_type", search.mediaType);
  if (search.resourceType)
    query = query.contains("resource_types", [search.resourceType]);
  if (search.genre) query = query.contains("genres", [search.genre]);

  const sort = search.sort ?? "newest";
  if (sort === "featured") {
    query = query
      .order("featured", { ascending: false })
      .order("featured_rank", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    ok: true,
    data: (data ?? []) as Asset[],
    page,
    per,
    total: count ?? 0,
    pageCount: count ? Math.ceil(count / per) : 0,
  };
}

async function fetchLookups(): Promise<{
  disciplines: Lookup[];
  gradeBands: Lookup[];
  resourceTypes: Lookup[];
  genres: Lookup[];
}> {
  const supabase = await getServerSupabase();
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
    per: first(spIn.per), // <-- pick up per
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

  function buildUrl(
    nextParams: Record<string, string | number | undefined>,
    current: SearchParams
  ) {
    const params = new URLSearchParams();
    const merged = { page: "1", sort: "newest", ...current, ...nextParams };
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && String(v).length) params.set(k, String(v));
    });
    return `/catalog?${params.toString()}`;
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Catalog</h1>

      <form
        className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white/60 p-4 shadow-sm sm:flex-row sm:items-center"
        action="/catalog"
      >
        <Input
          name="q"
          placeholder="Search title or description…"
          defaultValue={sp.q || ""}
          className="sm:flex-1"
        />

        <select
          name="sort"
          defaultValue={sort}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="featured">Featured</option>
          <option value="relevance">Relevance</option>
        </select>
        <Button type="submit" className="shrink-0">
          Search
        </Button>
        <Link
          href="/catalog"
          className="text-sm font-semibold text-gray-600 underline"
        >
          Reset
        </Link>
      </form>

      <div className="space-y-4">
        <FilterChipGroup
          label="Discipline"
          options={lookups.disciplines}
          currentValue={sp.discipline}
          paramKey="discipline"
          buildUrl={(next) => buildUrl(next, sp)}
        />
        <FilterChipGroup
          label="Grade Band"
          options={lookups.gradeBands}
          currentValue={sp.gradeBand}
          paramKey="gradeBand"
          buildUrl={(next) => buildUrl(next, sp)}
        />
        <FilterChipGroup
          label="Resource Type"
          options={lookups.resourceTypes}
          currentValue={sp.resourceType}
          paramKey="resourceType"
          buildUrl={(next) => buildUrl(next, sp)}
        />
        <FilterChipGroup
          label="Genre"
          options={lookups.genres}
          currentValue={sp.genre}
          paramKey="genre"
          buildUrl={(next) => buildUrl(next, sp)}
        />
      </div>

      <div className="text-sm font-medium text-muted-foreground">
        {`${total} ${total === 1 ? "result" : "results"}`}
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((a: Asset) => {
          const disciplineSlug = a.discipline ?? undefined;
          const gradeSlugs = a.grade_bands ?? [];
          const resourceSlugs = a.resource_types ?? [];
          const genreSlugs = a.genres ?? [];

          const chips: {
            key: string;
            label: string;
            href: string;
            isActive: boolean;
          }[] = [];

          if (disciplineSlug) {
            const isActive = sp.discipline === disciplineSlug;
            chips.push({
              key: `discipline-${disciplineSlug}`,
              label: formatTaxonomyLabel(disciplineSlug),
              href: buildUrl(
                {
                  discipline: isActive ? undefined : disciplineSlug,
                },
                sp
              ),
              isActive,
            });
          }

          gradeSlugs.forEach((value) => {
            const isActive = sp.gradeBand === value;
            chips.push({
              key: `grade-${value}`,
              label: formatTaxonomyLabel(value),
              href: buildUrl(
                {
                  gradeBand: isActive ? undefined : value,
                },
                sp
              ),
              isActive,
            });
          });

          resourceSlugs.forEach((value) => {
            const isActive = sp.resourceType === value;
            chips.push({
              key: `resource-${value}`,
              label: formatTaxonomyLabel(value),
              href: buildUrl(
                {
                  resourceType: isActive ? undefined : value,
                },
                sp
              ),
              isActive,
            });
          });

          genreSlugs.forEach((value) => {
            const isActive = sp.genre === value;
            chips.push({
              key: `genre-${value}`,
              label: formatTaxonomyLabel(value),
              href: buildUrl(
                {
                  genre: isActive ? undefined : value,
                },
                sp
              ),
              isActive,
            });
          });

          return (
            <Card key={a.id} className="flex h-full flex-col p-3 transition hover:shadow-md">
              <Link
                href={{
                  pathname: `/asset/${a.id}`,
                  query: { from: "/catalog" },
                }}
                className="block"
              >
                <div className="aspect-video overflow-hidden rounded bg-gray-100">
                  {a.thumbnail_url ? (
                    <Image
                      src={a.thumbnail_url}
                      alt={a.title}
                      width={640}
                      height={360}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <PlaceholderThumbnail title={a.title} />
                  )}
                </div>
                <h3 className="mt-3 text-base font-semibold text-gray-900">
                  {a.title}
                </h3>
                {a.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {a.description}
                  </p>
                ) : null}
              </Link>
              {chips.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <Link
                      key={chip.key}
                      href={chip.href}
                      role="button"
                      aria-pressed={chip.isActive}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 ${
                        chip.isActive
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {chip.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </Card>
          );
        })}
      </section>

      {/* Pagination */}
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
