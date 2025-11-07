// src/app/sign-up/page.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useRedirectTarget } from "@/hooks/useRedirectTarget";
import { withRedirectParam } from "@/lib/redirect";
import { supabase } from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /.+@.+\..+/i;

type FieldErrors = { email?: string; password?: string; confirm?: string };
type FormMessage = { type: "error" | "success"; text: string };

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [pending, setPending] = useState(false);
  const { redirectTo /* resolveRedirect not needed here */ } =
    useRedirectTarget();

  const isScreenshotMode = useMemo(
    () => process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1",
    []
  );

  function validateFields() {
    const nextErrors: FieldErrors = {};
    if (!email.trim()) nextErrors.email = "Enter your email.";
    else if (!EMAIL_PATTERN.test(email))
      nextErrors.email = "Enter a valid email.";

    if (!password.trim()) nextErrors.password = "Create a password.";
    else if (password.length < MIN_PASSWORD_LENGTH)
      nextErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;

    if (!confirmPassword.trim()) nextErrors.confirm = "Confirm your password.";
    else if (password !== confirmPassword)
      nextErrors.confirm = "Passwords must match.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (!validateFields()) return;

    setPending(true);
    setMessage(null);

    // Screenshot mode: short-circuit, no network
    if (isScreenshotMode) {
      const successText = "Check your email to verify your account.";
      setMessage({ type: "success", text: successText });
      toast.success(successText);
      setPending(false);
      return;
    }

    try {
      const SITE_URL =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const emailRedirectTo = `${SITE_URL}/verify`;
      console.log("[signup] emailRedirectTo =", emailRedirectTo);

      try {
        const { data: s } = await supabase.auth.getUser();
        const currentEmail = s?.user?.email;
        if (currentEmail && currentEmail !== email) {
          console.log(
            "[signup] Found active session for",
            currentEmail,
            "— signing out before new signup"
          );
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.warn("[signup] session check failed:", err);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });

      console.log("[signup] result:", {
        error: error?.message || null,
        userId: data?.user?.id || null,
        email: data?.user?.email || null,
        sessionPresent: Boolean(data?.session),
      });

      if (error) {
        console.error("signUp error:", error.message);
        const text =
          error.message || "We couldn’t create your account just yet.";
        setMessage({ type: "error", text });
        toast.error(text);
        setPending(false);
        return;
      }

      const successText = "Check your email to verify your account.";
      setMessage({ type: "success", text: successText });
      toast.success(successText);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "We couldn’t create your account.";
      console.error("signUp exception:", msg);
      setMessage({ type: "error", text: msg });
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  const signInHref = withRedirectParam("/sign-in", redirectTo);

  return (
    <main className="mx-auto max-w-sm space-y-5 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          We’ll send a verification email before you can sign in.
        </p>
      </header>

      <div aria-live="polite" aria-atomic="true" className="space-y-2">
        {message ? (
          <Alert variant={message.type === "error" ? "destructive" : "success"}>
            <AlertTitle>
              {message.type === "error"
                ? "Unable to sign up"
                : "Check your inbox"}
            </AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            autoComplete="email"
            inputMode="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            required
          />
          {errors.email && (
            <p id="signup-email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            autoComplete="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password) || undefined}
            aria-describedby={
              errors.password ? "signup-password-error" : undefined
            }
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
          {errors.password && (
            <p id="signup-password-error" className="text-sm text-destructive">
              {errors.password}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            autoComplete="new-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={Boolean(errors.confirm) || undefined}
            aria-describedby={
              errors.confirm ? "signup-confirm-error" : undefined
            }
            required
          />
          {errors.confirm && (
            <p id="signup-confirm-error" className="text-sm text-destructive">
              {errors.confirm}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Creating your account…
            </span>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="text-sm">
        Already registered?{" "}
        <Link className="underline" href={signInHref}>
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
