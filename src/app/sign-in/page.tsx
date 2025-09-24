// src/app/sign-in/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    router.replace("/dashboard");
  }

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email to confirm your account.");
  }

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <div className="space-y-2">
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          placeholder="Password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <div className="flex gap-2">
          <Button onClick={signIn} disabled={loading}>Sign in</Button>
          <Button variant="secondary" onClick={signUp} disabled={loading}>Create account</Button>
        </div>
      </div>
      <p className="text-sm">
        <a className="underline" href="/reset-password">Forgot password?</a>
      </p>
      <p className="text-sm text-muted-foreground">
        <Link href="/">Back home</Link>
      </p>
    </main>
  );
}
