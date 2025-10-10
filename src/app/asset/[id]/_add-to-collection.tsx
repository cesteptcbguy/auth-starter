"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Coll = { id: number; name: string };
type Membership = { collectionId: number; name: string | null };

type Props = {
  assetId: number;
  initialMemberships: Membership[];
  isAuthenticated: boolean;
};

export default function AddToCollection({
  assetId,
  initialMemberships,
  isAuthenticated,
}: Props) {
  const [collections, setCollections] = useState<Coll[]>([]);
  const [selected, setSelected] = useState<number | "">("");
  const [memberships, setMemberships] =
    useState<Membership[]>(initialMemberships);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);

  useEffect(() => {
    setMemberships(initialMemberships);
  }, [initialMemberships]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setIsLoadingCollections(true);
    fetch("/api/collections", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.ok) {
          setCollectionsError(json.error || "Unable to load collections");
          return;
        }
        setCollections(json.data as Coll[]);
        if (json.data && json.data[0]) {
          setSelected((prev) => (prev === "" ? json.data[0].id : prev));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCollectionsError("Unable to load collections");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingCollections(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const membershipIds = useMemo(
    () => new Set(memberships.map((m) => m.collectionId)),
    [memberships]
  );

  async function handleAdd() {
    if (!selected || typeof selected !== "number") {
      toast.error("Choose a collection");
      return;
    }
    if (membershipIds.has(selected)) {
      toast.success("Already in that collection");
      return;
    }

    setIsAdding(true);
    const res = await fetch(`/api/collections/${selected}/items`, {
      method: "POST",
      body: JSON.stringify({ assetId }),
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json().catch(() => ({ ok: false }));
    setIsAdding(false);

    if (!json?.ok) {
      toast.error(json?.error || "Unable to add to collection");
      return;
    }

    const found = collections.find((c) => c.id === selected);
    setMemberships((prev) => [
      ...prev,
      {
        collectionId: selected,
        name: found?.name ?? "Untitled",
      },
    ]);
    toast.success("Added to collection");
  }

  async function handleRemove(collectionId: number) {
    const snapshot = memberships;
    setRemoving(collectionId);
    setMemberships((prev) =>
      prev.filter((m) => m.collectionId !== collectionId)
    );

    const res = await fetch(
      `/api/collections/${collectionId}/items?assetId=${assetId}`,
      { method: "DELETE" }
    );
    const json = await res.json().catch(() => ({ ok: false }));

    if (!json?.ok) {
      setMemberships(snapshot);
      toast.error(json?.error || "Unable to remove from collection");
    } else {
      toast.success("Removed from collection");
    }
    setRemoving(null);
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-gray-200 bg-white/80 p-4 text-sm text-gray-600">
        <p>Sign in to add this asset to your collections.</p>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="default">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/sign-up">Create account</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-gray-700">
          Add to collection
        </label>
        <select
          className="min-w-[180px] rounded-md border border-gray-200 px-3 py-2 text-sm"
          value={selected}
          onChange={(event) => {
            const value = Number(event.target.value);
            setSelected(Number.isNaN(value) ? "" : value);
          }}
          disabled={isLoadingCollections || collections.length === 0}
        >
          <option value="" disabled>
            {isLoadingCollections ? "Loading…" : "Choose collection"}
          </option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
        </select>
        <Button onClick={handleAdd} disabled={isAdding || !selected}>
          {isAdding ? "Adding…" : "Add"}
        </Button>
      </div>

      {collectionsError ? (
        <p className="text-xs text-destructive">{collectionsError}</p>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">
          In your collections
        </h3>
        {memberships.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Not part of any collections yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {memberships.map((membership) => (
              <li
                key={membership.collectionId}
                className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <span className="text-sm font-medium text-gray-800">
                  {membership.name ?? "Untitled"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(membership.collectionId)}
                  disabled={removing === membership.collectionId}
                >
                  {removing === membership.collectionId ? "Removing…" : "Remove"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {collections.length > 0 &&
      memberships.length < collections.length &&
      collections.length > 1 ? (
        <p className="text-xs text-muted-foreground">
          Tip: add this asset to multiple collections to reuse it in different
          catalogs.
        </p>
      ) : null}
    </div>
  );
}
