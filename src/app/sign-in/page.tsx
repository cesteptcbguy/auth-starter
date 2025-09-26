// src/app/sign-in/page.tsx
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase/client";
import { upsertUserProfile } from "@/lib/profile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormMessage = {
  type: "error" | "success";
  text: string;
};

type SubmittingAction = "sign-in" | "sign-up" | null;

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [submitting, setSubmitting] = useState<SubmittingAction>(null);
  const router = useRouter();

  async function handleSignIn(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (submitting) return;

    setMessage(null);
    setSubmitting("sign-in");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      toast.error(error.message);
      setSubmitting(null);
      return;
    }

    const signedInUser = data.user;
    const session = data.session;

    if (signedInUser?.id && session) {
      const profileEmail = signedInUser.email ?? email;
      const { error: profileError } = await upsertUserProfile(supabase, {
        id: signedInUser.id,
        email: profileEmail,
      });

      if (profileError) {
        console.error("user_profiles upsert error", profileError);
        const fallbackMessage = "We could not load your profile. Please try again.";
        setMessage({ type: "error", text: fallbackMessage });
        toast.error(fallbackMessage);
        setSubmitting(null);
        return;
      }
    }

    toast.success("Signed in");
    setSubmitting(null);
    router.replace("/dashboard");
  }

  async function handleSignUp() {
    if (submitting) return;

    setMessage(null);
    setSubmitting("sign-up");

    const { error } = await supabase.auth.signUp({ email, password: pw });

    if (error) {
      setMessage({ type: "error", text: error.message });
      toast.error(error.message);
      setSubmitting(null);
      return;
    }

    const successText = "Check your email to confirm your account.";
    setMessage({ type: "success", text: successText });
    toast.success(successText);
    setSubmitting(null);
  }

  return (
    <main className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <div aria-live="polite" aria-atomic="true" className="space-y-2">
        {message ? (
          <Alert variant={message.type === "error" ? "destructive" : "success"}>
            <AlertTitle>{message.type === "error" ? "Something went wrong" : "Check your inbox"}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
      </div>
      <form className="space-y-3" onSubmit={handleSignIn} noValidate>
        <Input
          autoComplete="email"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          autoComplete="current-password"
          placeholder="Password"
          type="password"
          value={pw}
          onChange={(event) => setPw(event.target.value)}
          required
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={Boolean(submitting)}>
            {submitting === "sign-in" ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSignUp}
            disabled={Boolean(submitting)}
          >
            {submitting === "sign-up" ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </div>
      </form>
      <p className="text-sm">
        <Link className="underline" href="/reset-password">
          Forgot password?
        </Link>
      </p>
      <p className="text-sm text-muted-foreground">
        <Link href="/">Back home</Link>
      </p>
    </main>
  );
}
