// src/app/verify/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useRedirectTarget } from "@/hooks/useRedirectTarget";
import {
  isValidRedirect,
  resolveRedirectPath,
  withRedirectParam,
} from "@/lib/redirect";
import { supabase } from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const SUCCESS_DETAIL = "Your account is confirmed. You can continue.";
const ALREADY_DETAIL = "This link was already used. You can sign in instead.";
const ERROR_DETAIL = "This link is invalid or has expired. Request a new one.";

const rawEmailOtpTypes = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
] as const;
type EmailOtpTypeAllowed = (typeof rawEmailOtpTypes)[number];
type VerifyState = "idle" | "loading" | "verified" | "already" | "error";

function isEmailOtpType(v: string | null): v is EmailOtpTypeAllowed {
  return !!v && (rawEmailOtpTypes as readonly string[]).includes(v);
}

type QueryState = {
  token_hash?: string; // may arrive as ?token= or ?token_hash=
  type?: string; // signup|invite|magiclink|recovery|email_change
  redirectTo?: string;
  mock?: string;
  error?: string | null; // Supabase may append these on failure
  error_description?: string | null;
  code?: string | null; // Ignore PKCE on this page
};

function readQuery(): QueryState {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const token_hash = p.get("token_hash") ?? p.get("token") ?? undefined;
  return {
    token_hash,
    type: p.get("type") ?? undefined,
    redirectTo: p.get("redirectTo") ?? undefined,
    mock: p.get("mock") ?? undefined,
    error: p.get("error"),
    error_description: p.get("error_description"),
    code: p.get("code"),
  };
}

export default function VerifyPage() {
  const [qs, setQs] = useState<QueryState>(() => readQuery());
  const [ready, setReady] = useState(false);

  const {
    token_hash,
    type,
    redirectTo: redirectParam,
    mock,
    error,
    error_description,
    code,
  } = qs;

  const { redirectTo, resolveRedirect, setRedirectTo } = useRedirectTarget(
    redirectParam ?? null
  );

  const [state, setState] = useState<VerifyState>("loading");
  const [detail, setDetail] = useState<string | undefined>();

  const isScreenshotMode = useMemo(
    () => process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1",
    []
  );

  // keep URL params in state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      setQs(readQuery());
      setReady(true);
    };
    update();
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  // persist redirect target if supplied & valid
  useEffect(() => {
    if (redirectParam && isValidRedirect(redirectParam)) {
      setRedirectTo(redirectParam);
    }
  }, [redirectParam, setRedirectTo]);

  // core verification flow — email link only (we ignore PKCE on this page)
  useEffect(() => {
    if (isScreenshotMode) {
      if (mock === "verified") {
        setState("verified");
        setDetail(SUCCESS_DETAIL);
      } else if (mock === "already") {
        setState("already");
        setDetail(ALREADY_DETAIL);
      } else if (mock === "error") {
        setState("error");
        setDetail(ERROR_DETAIL);
      } else {
        setState("loading");
        setDetail(undefined);
      }
      return;
    }

    if (!ready) return;

    async function run() {
      try {
        setState("loading");

        // 0) Ignore PKCE on /verify (handled on a dedicated oauth callback route)
        if (code) {
          console.warn("[verify] ignoring PKCE code on /verify");
        }

        // 1) If Supabase reported an error in the URL, show it
        if (error) {
          const d = error_description || ERROR_DETAIL;
          console.error("[verify] URL error:", error, d);
          setState(error === "already_verified" ? "already" : "error");
          setDetail(d);
          if (error === "already_verified")
            toast.success("You can sign in now.");
          else toast.error(d);
          return;
        }

        // 2) If we got a token_hash + valid type, verify via SDK
        if (token_hash && isEmailOtpType(type || null)) {
          console.log("[verify] calling verifyOtp", {
            type,
            token_hash_present: !!token_hash,
          });
          const { error: vError } = await supabase.auth.verifyOtp({
            type: type as EmailOtpTypeAllowed,
            token_hash,
          });
          if (vError) {
            console.error("[verify] verifyOtp error:", vError.message);
            const msg = vError.message || ERROR_DETAIL;
            const isAlready = /already/i.test(msg);
            setState(isAlready ? "already" : "error");
            setDetail(isAlready ? ALREADY_DETAIL : msg);
            if (isAlready) toast.success("You can sign in now.");
            else toast.error(msg);
            return;
          }
          setState("verified");
          setDetail(SUCCESS_DETAIL);
          toast.success("Your account is verified.");
          return;
        }

        // 3) If there is NO token and NO error, Supabase likely verified upstream
        //    and redirected cleanly to our /verify page. Treat as success.
        if (!token_hash && !error) {
          console.log(
            "[verify] no token/error present; assuming upstream success"
          );
          setState("verified");
          setDetail(SUCCESS_DETAIL);
          toast.success("Your account is verified.");
          return;
        }

        // 4) Fallback
        throw new Error("Missing verification token.");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : ERROR_DETAIL;
        console.error("[verify] exception:", msg);
        setState("error");
        setDetail(msg || ERROR_DETAIL);
        toast.error(msg || ERROR_DETAIL);
      }
    }

    run();
  }, [
    ready,
    isScreenshotMode,
    mock,
    token_hash,
    type,
    error,
    error_description,
    code,
  ]);

  const continueLabel = state === "already" ? "Go to sign in" : "Continue";

  async function handleContinue() {
    if (state === "error" || state === "loading") return;
    const resolved = (await resolveRedirect()) ?? redirectTo;
    const target = resolveRedirectPath(resolved);
    const dest =
      state === "already" ? withRedirectParam("/sign-in", target) : target;
    window.location.replace(dest);
  }

  const signInHref = withRedirectParam("/sign-in", redirectTo);

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Verify your account</h1>
        <p className="text-sm text-muted-foreground">
          {state === "loading"
            ? "We’re confirming your email. Hang tight."
            : "Use the button below to continue."}
        </p>
      </header>

      <div aria-live="polite" aria-atomic="true" className="space-y-2">
        {state === "loading" ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed p-4">
            <Loader2 aria-hidden className="size-5 animate-spin" />
            <span className="text-sm font-medium">Verifying your email…</span>
          </div>
        ) : (
          <Alert variant={state === "error" ? "destructive" : "success"}>
            <AlertTitle>
              {state === "verified"
                ? "Email confirmed"
                : state === "already"
                ? "Already verified"
                : "Verification failed"}
            </AlertTitle>
            <AlertDescription>{detail}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-3">
        <Button
          className="w-full"
          disabled={state === "loading"}
          onClick={handleContinue}
        >
          {state === "loading" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Checking…
            </span>
          ) : (
            continueLabel
          )}
        </Button>

        <p className="text-sm text-center text-muted-foreground">
          Having trouble?{" "}
          <Link className="underline" href={signInHref}>
            Go to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
