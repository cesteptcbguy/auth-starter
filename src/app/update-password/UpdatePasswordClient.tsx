"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import AuthGate from "@/components/AuthGate";
import { useRedirectTarget } from "@/hooks/useRedirectTarget";
import { resolveRedirectPath, withRedirectParam } from "@/lib/redirect";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD_LENGTH = 8;

type FieldErrors = {
  password?: string;
  confirm?: string;
};

type FormMessage = {
  type: "error" | "success";
  text: string;
};

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const { redirectTo, resolveRedirect } = useRedirectTarget();

  const isScreenshotMode = useMemo(() => {
    return process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1";
  }, []);

  function validate() {
    const nextErrors: FieldErrors = {};

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
    const resolved = (await resolveRedirect()) ?? redirectTo;
    const destination = resolveRedirectPath(resolved);
    router.replace(withRedirectParam("/sign-in", destination));
  }

  const signInHref = withRedirectParam("/sign-in", redirectTo);
  const canContinue = message?.type === "success";

  return (
    <AuthGate>
      <main className="mx-auto max-w-sm space-y-5 p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a strong password that you haven’t used before.
          </p>
        </header>

        <div aria-live="polite" aria-atomic="true" className="space-y-2">
          {message ? (
            <Alert
              variant={message.type === "error" ? "destructive" : "success"}
            >
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
              <p
                id="update-password-error"
                className="text-sm text-destructive"
              >
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
          <p className="text-muted-foreground">
            Head there yourself?{" "}
            <Link className="underline" href={signInHref}>
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </AuthGate>
  );
}
