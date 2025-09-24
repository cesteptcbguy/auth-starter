// src/app/reset-password/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");

  async function sendReset() {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_WEB_BASE_URL ?? "http://localhost:3000"}/update-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Check your email for a reset link.");
  }

  return (
    <main className="mx-auto max-w-sm p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <Input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
      <Button onClick={sendReset} disabled={!email}>Send reset link</Button>
    </main>
  );
}
