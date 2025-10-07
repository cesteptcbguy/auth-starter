// src/app/asset/[id]/_add-to-collection.tsx
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Coll = { id:number; name:string };

export default function AddToCollection({ assetId }: { assetId: number }) {
  const [collections, setCollections] = useState<Coll[]>([]);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/collections").then(r=>r.json()).then(j=>{
      if (j.ok) { setCollections(j.data); if (j.data[0]) setSel(j.data[0].id); }
    });
  }, []);

  async function add() {
    if (!sel) return toast.error("Choose a collection");
    const res = await fetch(`/api/collections/${sel}/items`, { method:"POST", body: JSON.stringify({ assetId }) });
    const j = await res.json();
    if (!j.ok) return toast.error(j.error || "Error");
    toast.success("Added to collection");
  }

  return (
    <div className="flex gap-2 items-center">
      <select className="border rounded px-3 py-2" value={sel ?? ""} onChange={e=>setSel(Number(e.target.value))}>
        <option value="" disabled>Choose collection</option>
        {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <Button onClick={add}>Add to collection</Button>
    </div>
  );
}
