// src/app/update-password/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function update() {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. Please sign in.");
    router.replace("/sign-in");
  }

  return (
    <main className="mx-auto max-w-sm p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <Input type="password" placeholder="New password" value={pw} onChange={e=>setPw(e.target.value)} />
      <Button onClick={update} disabled={!pw || loading}>Update password</Button>
    </main>
  );
}
