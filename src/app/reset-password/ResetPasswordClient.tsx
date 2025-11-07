"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useRedirectTarget } from "@/hooks/useRedirectTarget";
import { getWebOrigin, resolveRedirectPath } from "@/lib/redirect";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_PATTERN = /.+@.+\..+/i;
const MIN_PASSWORD_LENGTH = 8;

type FormMessage = { type: "error" | "success"; text: string };
type RedirectHook = ReturnType<typeof useRedirectTarget>;

// Helpers for typed routes
function signInUrlObject(redirect?: string | null) {
  return redirect && redirect.trim()
    ? ({ pathname: "/sign-in", query: { redirectTo: redirect } } as const)
    : "/sign-in";
}
function signInRoute(redirect?: string | null): Route {
  const q =
    redirect && redirect.trim()
      ? `?redirectTo=${encodeURIComponent(redirect)}`
      : "";
  return `/sign-in${q}` as Route;
}

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams?.get("redirectTo") ?? null;
  const modeParam = (searchParams?.get("mode") ?? "").toLowerCase();
  const typeParam = (searchParams?.get("type") ?? "").toLowerCase();
  const redirect = useRedirectTarget(redirectParam);
  const isScreenshotMode = useMemo(
    () => process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1",
    []
  );

  const shouldShowUpdate =
    modeParam === "update" ||
    typeParam === "recovery" ||
    !!searchParams?.get("access_token");

  if (shouldShowUpdate) {
    return (
      <UpdatePasswordForm
        redirect={redirect}
        isScreenshotMode={isScreenshotMode}
      />
    );
  }

  return (
    <RequestResetForm redirect={redirect} isScreenshotMode={isScreenshotMode} />
  );
}

function RequestResetForm({
  redirect,
  isScreenshotMode,
}: {
  redirect: RedirectHook;
  isScreenshotMode: boolean;
}) {
  const { redirectTo, resolveRedirect } = redirect;
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [pending, setPending] = useState(false);

  function validate() {
    const nextErrors: { email?: string } = {};
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

    const successText = "If an account exists, we’ve emailed a link.";

    const resolved = resolveRedirectPath(
      (await resolveRedirect()) ?? redirectTo ?? null
    );

    const redirectUrl = new URL("/reset-password", getWebOrigin());
    redirectUrl.searchParams.set("mode", "update");
    if (resolved) {
      redirectUrl.searchParams.set("redirectTo", resolved);
    }

    if (isScreenshotMode) {
      setMessage({ type: "success", text: successText });
      toast.success(successText);
      setPending(false);
      return;
    }

    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
      email,
      {
        redirectTo: redirectUrl.toString(),
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

  const signInHref = signInUrlObject(redirectTo);

  return (
    <main className="mx-auto max-w-sm space-y-5 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-sm text-foreground/80">
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

function UpdatePasswordForm({
  redirect,
  isScreenshotMode,
}: {
  redirect: RedirectHook;
  isScreenshotMode: boolean;
}) {
  const router = useRouter();
  const { redirectTo, resolveRedirect } = redirect;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>(
    {}
  );
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [pending, setPending] = useState(false);

  function validate() {
    const nextErrors: { password?: string; confirm?: string } = {};

    if (!password.trim()) {
      nextErrors.password = "Enter a new password.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (!confirmPassword.trim()) {
      nextErrors.confirm = "Confirm your new password.";
    } else if (password !== confirmPassword) {
      nextErrors.confirm = "Passwords must match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const valid = validate();
    if (!valid) return;

    setPending(true);
    setMessage(null);

    if (isScreenshotMode) {
      const successText = "Password updated. Use it the next time you sign in.";
      setMessage({ type: "success", text: successText });
      toast.success(successText);
      setPending(false);
      return;
    }

    const { error } = await getSupabaseClient().auth.updateUser({ password });

    if (error) {
      const text = error.message || "We couldn’t update your password.";
      setMessage({ type: "error", text });
      toast.error(text);
      setPending(false);
      return;
    }

    const successText =
      "Password updated. You can sign in again with your new password.";
    setMessage({ type: "success", text: successText });
    toast.success(successText);
    setPending(false);
  }

  async function handleContinue() {
    const resolved = resolveRedirectPath(
      (await resolveRedirect()) ?? redirectTo ?? null
    );
    router.replace(signInRoute(resolved));
  }

  const signInHref = signInUrlObject(redirectTo);
  const canContinue = message?.type === "success";

  return (
    <main className="mx-auto max-w-sm space-y-5 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="text-sm text-foreground/80">
          Choose a strong password that you haven’t used before.
        </p>
      </header>

      <div aria-live="polite" aria-atomic="true" className="space-y-2">
        {message ? (
          <Alert variant={message.type === "error" ? "destructive" : "success"}>
            <AlertTitle>
              {message.type === "error"
                ? "Unable to update password"
                : "Password updated"}
            </AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            autoComplete="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password) || undefined}
            aria-describedby={
              errors.password ? "update-password-error" : undefined
            }
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
          {errors.password ? (
            <p id="update-password-error" className="text-sm text-destructive">
              {errors.password}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            autoComplete="new-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={Boolean(errors.confirm) || undefined}
            aria-describedby={
              errors.confirm ? "update-confirm-error" : undefined
            }
            required
          />
          {errors.confirm ? (
            <p id="update-confirm-error" className="text-sm text-destructive">
              {errors.confirm}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Updating…
            </span>
          ) : (
            "Update password"
          )}
        </Button>
      </form>

      <div className="space-y-3 text-sm">
        <Button
          className="w-full"
          variant="secondary"
          disabled={pending || !canContinue}
          onClick={handleContinue}
        >
          Continue to sign in
        </Button>
        <p className="text-foreground/80">
          Head there yourself?{" "}
          <Link className="underline" href={signInHref}>
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
