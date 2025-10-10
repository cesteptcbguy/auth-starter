import Link from "next/link";
import { Card } from "@/components/ui/card";

type CollectionSummary = {
  id: string;
  name: string | null;
  created_at: string | null;
};

interface CollectionsGridProps {
  collections: CollectionSummary[] | null | undefined;
}

export default function CollectionsGrid({
  collections,
}: CollectionsGridProps) {
  if (!collections || collections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
        No collections yet. Create your first one to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((collection) => (
        <Link
          key={collection.id}
          id={`col-${collection.id}`}
          href={`/collections/${collection.id}`}
        >
          <Card className="p-4 transition hover:border-gray-300 hover:shadow-md">
            <h3 className="font-medium">
              {collection.name ?? "Untitled collection"}
            </h3>
            <div className="text-xs text-gray-500">#{collection.id}</div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
