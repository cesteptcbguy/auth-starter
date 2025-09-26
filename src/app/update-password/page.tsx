// src/app/update-password/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormMessage = {
  type: "error" | "success";
  text: string;
};

export default function UpdatePasswordPage() {
  const [pw, setPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setMessage(null);
    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password: pw });

    if (error) {
      setMessage({ type: "error", text: error.message });
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    toast.success("Password updated. Please sign in.");
    setSubmitting(false);
    router.replace("/sign-in");
  }

  return (
    <main className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <div aria-live="polite" aria-atomic="true" className="space-y-2">
        {message ? (
          <Alert variant={message.type === "error" ? "destructive" : "success"}>
            <AlertTitle>
              {message.type === "error" ? "Unable to update password" : "All set"}
            </AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
      </div>
      <form className="space-y-3" onSubmit={handleSubmit} noValidate>
        <Input
          autoComplete="new-password"
          type="password"
          placeholder="New password"
          value={pw}
          onChange={(event) => setPw(event.target.value)}
          minLength={6}
          required
        />
        <Button type="submit" disabled={!pw || submitting}>
          {submitting ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </main>
  );
}
