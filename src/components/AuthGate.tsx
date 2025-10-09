"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { getSupabaseClient } from "@/lib/supabase/client";

type AuthGateProps = {
  children: ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);
  const [checked, setChecked] = useState(false);
  const redirectingRef = useRef(false);
  const redirectRef = useRef<string>("/");

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1") {
      // Screenshot mode bypasses auth entirely
      setHasSession(true);
      setChecked(true);
      return;
    }

    let isMounted = true;

    if (typeof window !== "undefined") {
      const { pathname, search } = window.location;
      redirectRef.current = `${pathname}${search}`;
    }

    function redirectToSignIn() {
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      const q = new URLSearchParams();
      q.set("redirectTo", redirectRef.current);
      router.replace(`/sign-in?${q.toString()}`);
    }

    async function resolveSession() {
      const {
        data: { session },
      } = await getSupabaseClient().auth.getSession();

      if (!isMounted) return;

      if (session) {
        setHasSession(true);
        setChecked(true);
      } else {
        redirectToSignIn();
      }
    }

    resolveSession();

    const { data: authListener } = getSupabaseClient().auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;

        if (session) {
          setHasSession(true);
          setChecked(true);
        } else {
          redirectToSignIn();
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  if (!checked || !hasSession) {
    return (
      <div
        className="flex min-h-[200px] items-center justify-center gap-2"
        aria-live="polite"
      >
        <Loader2 aria-hidden className="size-5 animate-spin" />
        <span className="text-sm font-medium">Checking your session…</span>
      </div>
    );
  }

  return <>{children}</>;
}
