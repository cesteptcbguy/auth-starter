// app/sign-in/page.tsx
"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useRedirectTarget } from "@/hooks/useRedirectTarget";
import { resolveRedirectPath, withRedirectParam } from "@/lib/redirect";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormMessage = { type: "error" | "success"; text: string };
type FieldErrors = { email?: string; password?: string };

function readRedirectFromUrl(): string | null {
  try {
    const p = new URLSearchParams(window.location.search);
    const raw = p.get("redirectTo");
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [pending, setPending] = useState(false);

  const { redirectTo, resolveRedirect } = useRedirectTarget();
  const isScreenshotMode = useMemo(
    () => process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1",
    []
  );

  // ---- redirect-once guard ----
  const hasNavigatedRef = useRef(false);
  const markNavigated = () => {
    hasNavigatedRef.current = true;
  };
  const alreadyNavigated = () => hasNavigatedRef.current;

  // Decide destination
  const computeTarget = async (): Promise<string> => {
    let target = readRedirectFromUrl();
    if (!target) target = (await resolveRedirect()) ?? redirectTo ?? null;
    if (!target) target = "/dashboard";
    return resolveRedirectPath(target);
  };

  // Navigate once (hard replace to avoid router race conditions)
  const navigateOnce = async () => {
    if (alreadyNavigated()) return;
    const dest = await computeTarget();
    if (dest === `${window.location.pathname}${window.location.search}`) return;
    markNavigated();
    window.location.replace(dest);
  };

  function validateFields() {
    const next: FieldErrors = {};
    if (!email.trim()) next.email = "Enter your email.";
    if (!password.trim()) next.password = "Enter your password.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // If already authed on load, bounce once; also listen for first SIGNED_IN
  useEffect(() => {
    if (isScreenshotMode) return;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await getSupabaseClient().auth.getUser();
        if (!cancelled && data?.user) {
          await navigateOnce();
        }
      } catch {
        /* ignore */
      }
    })();

    const { data: sub } = getSupabaseClient().auth.onAuthStateChange(
      async (event) => {
        if (isScreenshotMode) return;
        if (event === "SIGNED_IN") {
          await navigateOnce();
        }
      }
    );

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScreenshotMode]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    if (!validateFields()) return;

    setMessage(null);
    setPending(true);

    if (isScreenshotMode) {
      toast.success("Signed in (screenshot mode)");
      setPending(false);
      return;
    }

    const { error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const text = error.message || "Unable to sign in right now.";
      setMessage({ type: "error", text });
      toast.error(text);
      setPending(false);
      return;
    }

    toast.success("Signed in");
    // Backstop redirect immediately (listener will be ignored if already navigating)
    await navigateOnce();
    setPending(false);
  }

  const resetHref = withRedirectParam("/reset-password", redirectTo);

  return (
    <main className="mx-auto max-w-sm space-y-5 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-foreground/80">
          Welcome back! Enter your credentials to continue.
        </p>
      </header>

      <div aria-live="polite" aria-atomic="true" className="space-y-2">
        {message ? (
          <Alert variant={message.type === "error" ? "destructive" : "success"}>
            <AlertTitle>
              {message.type === "error" ? "Unable to sign in" : "All set"}
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
            aria-describedby={errors.email ? "email-error" : undefined}
            required
          />
          {errors.email ? (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password) || undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            required
          />
          {errors.password ? (
            <p id="password-error" className="text-sm text-destructive">
              {errors.password}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Signing in…
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="space-y-3 text-sm">
        <p>
          <Link className="underline" href={resetHref}>
            Forgot password?
          </Link>
        </p>
        <p>
          <Link className="text-foreground/80 underline" href="/">
            Back home
          </Link>
        </p>
      </div>
    </main>
  );
}
