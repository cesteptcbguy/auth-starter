"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/auth/SignOutButton";

type NavItem = {
  href: string;
  label: string;
  emphasis?: boolean;
};

const PRIMARY_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
];

const GUEST_AUTH_ITEMS: NavItem[] = [
  { href: "/sign-in", label: "Sign in" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const navItems = useMemo<NavItem[]>(() => {
    return [...PRIMARY_ITEMS, ...(hasSession ? [] : GUEST_AUTH_ITEMS)];
  }, [hasSession]);

  const activeHref = useMemo(() => {
    if (!pathname) return "/";
    const match = navItems.find((item) => {
      if (item.href === "/") {
        return pathname === "/";
      }
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    });
    return match?.href ?? "/";
  }, [pathname, navItems]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setHasSession(Boolean(data.session));
    });

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      'input:not([disabled]):not([type="hidden"])',
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(focusableSelectors)
    );

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab" || focusables.length === 0) return;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          KĀʻEO Item Bank App Suite
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 md:hidden"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <span className="sr-only">{isOpen ? "Close navigation" : "Open navigation"}</span>
            <span aria-hidden="true">Menu</span>
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </>
              )}
            </svg>
          </button>
          <div className="hidden items-center gap-4 text-sm font-medium text-gray-700 md:flex">
            {PRIMARY_ITEMS.map((item) => {
              const isActive = activeHref === item.href;
              const baseClass =
                "transition hover:text-gray-900";
              const activeClass = isActive
                ? "text-gray-900 underline underline-offset-8"
                : "";
              const emphasisClass = item.emphasis
                ? "rounded-lg border border-gray-200 px-3 py-1 transition hover:border-gray-300 hover:bg-gray-50"
                : "";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`${baseClass} ${emphasisClass} ${activeClass}`}
                >
                  {item.label}
                </Link>
              );
            })}
            {!hasSession ? (
              <>
                <span className="hidden h-5 w-px bg-gray-200 sm:block" />
                {GUEST_AUTH_ITEMS.map((item) => {
                  const isActive = activeHref === item.href;
                  const baseClass =
                    "transition hover:text-gray-900";
                  const activeClass = isActive
                    ? "text-gray-900 underline underline-offset-8"
                    : "";
                  const emphasisClass = item.emphasis
                    ? "rounded-lg border border-gray-200 px-3 py-1 transition hover:border-gray-300 hover:bg-gray-50"
                    : "";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`${baseClass} ${emphasisClass} ${activeClass}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </>
            ) : (
              <SignOutButton />
            )}
          </div>
        </div>
      </nav>

      <div
        id="mobile-nav"
        ref={panelRef}
        className={`md:hidden ${isOpen ? "block" : "hidden"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-t border-gray-200 bg-white/95 px-4 py-4">
          <nav className="flex flex-col gap-2">
            {[...PRIMARY_ITEMS, ...(hasSession ? [] : GUEST_AUTH_ITEMS)].map((item) => {
              const isActive = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-md px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 ${
                    isActive ? "bg-gray-100 underline underline-offset-4" : ""
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            {hasSession ? (
              <SignOutButton
                className="justify-start rounded-md px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
                onSignedOut={() => setIsOpen(false)}
              />
            ) : null}
            <button
              type="button"
              className="mt-2 inline-flex items-center justify-end text-sm text-gray-600 underline"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
