// client component to create
// src/app/collections/_create.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function CreateCollection() {
  const [name, setName] = useState("");
  async function create() {
    const res = await fetch("/api/collections", { method: "POST", body: JSON.stringify({ name }) });
    const j = await res.json();
    if (!j.ok) return toast.error(j.error || "Error");
    location.href = `/collections/${j.data.id}`;
  }
  return (
    <div className="flex gap-2 max-w-md">
      <Input placeholder="New collection name" value={name} onChange={e=>setName(e.target.value)} />
      <Button onClick={create} disabled={!name}>Create</Button>
    </div>
  );
}