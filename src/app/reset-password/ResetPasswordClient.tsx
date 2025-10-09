"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useRedirectTarget } from "@/hooks/useRedirectTarget";
import { buildAbsoluteUrl, withRedirectParam } from "@/lib/redirect";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_PATTERN = /.+@.+\..+/i;

type FieldErrors = { email?: string };
type FormMessage = { type: "error" | "success"; text: string };

export default function ResetPasswordClient() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [pending, setPending] = useState(false);
  const { redirectTo, resolveRedirect } = useRedirectTarget();

  const isScreenshotMode = useMemo(
    () => process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1",
    []
  );

  function validate() {
    const nextErrors: FieldErrors = {};
    if (!email.trim()) nextErrors.email = "Enter your email.";
    else if (!EMAIL_PATTERN.test(email))
      nextErrors.email = "Enter a valid email address.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!validate()) return;

    setPending(true);
    setMessage(null);

    const resolved = (await resolveRedirect()) ?? redirectTo;
    const redirectUrl = buildAbsoluteUrl("/update-password", resolved);

    const successText = "If an account exists, we’ve emailed a link.";

    if (isScreenshotMode) {
      setMessage({ type: "success", text: successText });
      toast.success(successText);
      setPending(false);
      return;
    }

    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
      email,
      {
        redirectTo: redirectUrl,
      }
    );

    if (error) {
      const text = error.message || "We couldn’t send the reset email.";
      setMessage({ type: "error", text });
      toast.error(text);
      setPending(false);
      return;
    }

    setMessage({ type: "success", text: successText });
    toast.success(successText);
    setPending(false);
  }

  const signInHref = withRedirectParam("/sign-in", redirectTo);

  return (
    <main className="mx-auto max-w-sm space-y-5 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          We’ll email a secure link to choose a new password.
        </p>
      </header>

      <div aria-live="polite" aria-atomic="true" className="space-y-2">
        {message ? (
          <Alert variant={message.type === "error" ? "destructive" : "success"}>
            <AlertTitle>
              {message.type === "error"
                ? "Something went wrong"
                : "Check your inbox"}
            </AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            autoComplete="email"
            inputMode="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={errors.email ? "reset-email-error" : undefined}
            required
          />
          {errors.email ? (
            <p id="reset-email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Sending link…
            </span>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>

      <p className="text-sm">
        Remembered your password?{" "}
        <Link className="underline" href={signInHref}>
          Return to sign in
        </Link>
      </p>
    </main>
  );
}
