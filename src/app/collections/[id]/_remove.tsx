// client-side remove button
// src/app/collections/[id]/_remove.tsx
"use client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RemoveBtn({ collectionId, assetId }: { collectionId: number; assetId: number; }) {
  async function remove() {
    const res = await fetch(`/api/collections/${collectionId}/items?assetId=${assetId}`, { method: "DELETE" });
    const j = await res.json();
    if (!j.ok) return toast.error(j.error || "Error");
    location.reload();
  }
  return <Button variant="secondary" onClick={remove}>Remove</Button>;
}