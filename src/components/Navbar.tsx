"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

type NavItem = {
  href: Route;
  label: string;
  authOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard", authOnly: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setHasSession(Boolean(data.session));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setHasSession(Boolean(session));
    });

    return () => {
      isMounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  const links = useMemo(
    () => NAV_ITEMS.filter((item) => (item.authOnly ? hasSession : true)),
    [hasSession]
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="text-lg font-semibold text-card-foreground">
          KĀʻEO Auth Starter
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {links.map((item) => {
            const hrefStr = item.href as string;
            const isActive =
              pathname === hrefStr ||
              (hrefStr !== "/" && pathname.startsWith(`${hrefStr}/`));

            return (
              <Link
                key={item.href}
                aria-current={isActive ? "page" : undefined}
                href={item.href}
                className={`text-sm font-medium transition ${
                  isActive ? "text-foreground" : "text-foreground/70"
                } hover:text-foreground`}
              >
                {item.label}
              </Link>
            );
          })}

          {hasSession ? (
            <SignOutButton className="text-sm font-medium text-primary underline-offset-4 hover:underline" />
          ) : (
            <Button asChild size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
