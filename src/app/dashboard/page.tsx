// src/app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppWindow } from "lucide-react";

import { getServerSupabase } from "@/lib/supabase/server";
import { getCurrentUserProfile, upsertUserProfile } from "@/lib/profile";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Button } from "@/components/ui/button";

const isScreenshotMode = process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1";

const appModules = [
  "Item Bank Data",
  "Action List",
  "Item Selection Tool",
  "TOAST",
  "Sample 5",
  "Sample 6",
  "Sample 7",
  "Sample 8",
];

function AppCard({ title }: { title: string }) {
  return (
    <article className="flex flex-col rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-primary p-3 text-primary-foreground">
          <AppWindow className="size-6" />
        </div>
        <h2 className="flex-1 text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex-1" />
      <Button variant="secondary" className="mt-4">
        Open
      </Button>
    </article>
  );
}

// ---- name/initial resolver (type-safe with loose profile) ----
type LooseProfile =
  | {
      full_name?: string | null;
      name?: string | null;
      email?: string | null;
    }
  | null
  | undefined;

function resolveNameAndInitial(args: {
  user: {
    email: string | null;
    user_metadata?: Record<string, unknown> | null | undefined;
  };
  profile?: LooseProfile;
}) {
  const { user, profile } = args;

  const meta = (user.user_metadata ?? {}) as {
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };

  const first = (meta.first_name || "").trim();
  const last = (meta.last_name || "").trim();
  const metaFull = (meta.full_name || "").trim();

  const fullName =
    [first, last].filter(Boolean).join(" ").trim() ||
    metaFull ||
    (profile?.full_name ?? "") ||
    (profile?.name ?? "") ||
    user.email ||
    "Account";

  const initial = fullName.charAt(0).toUpperCase() || "A";
  return { displayName: fullName, displayInitial: initial };
}

export default async function DashboardPage() {
  // Screenshot / mock mode (auth bypassed by middleware)
  if (isScreenshotMode) {
    const email = "teacher@boldbuilder.app";
    const displayName = "Jordan Teacher";
    const displayInitial = displayName.charAt(0);

    return (
      <main className="min-h-screen bg-background">
        <header className="border-b bg-card/60">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/70">
                Signed in as
              </p>
              <p className="text-sm font-medium">{email}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Avatar dot — link to /profile */}
              <Link
                href="/profile"
                aria-label="Profile"
                className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-secondary-foreground"
              >
                {displayInitial}
              </Link>
              <div className="text-right">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-foreground/70">Admin</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-5xl space-y-4 px-6 py-8">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-foreground/80">
            Welcome back, {displayName}. Here are your available app modules.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {appModules.map((title) => (
              <AppCard key={title} title={title} />
            ))}
          </div>
        </section>
      </main>
    );
  }

  // Normal mode (server-side auth + profile)
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Try to read the profile
  let { profile } = await getCurrentUserProfile(supabase, user.id);

  // If missing, create it and try again (keeps email available for header)
  if (!profile && user.email) {
    await upsertUserProfile(supabase, { id: user.id, email: user.email });
    ({ profile } = await getCurrentUserProfile(supabase, user.id));
  }

  const { displayName, displayInitial } = resolveNameAndInitial({
    user: {
      email: user.email ?? null,
      user_metadata: user.user_metadata ?? {},
    },
    profile, // may be null/undefined; helper handles it
  });

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-foreground/70">
              Signed in as
            </p>
            <p className="text-sm font-medium">
              {profile?.email ?? user.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Avatar dot — link to /profile (same size and color as before) */}
            <Link
              href="/profile"
              aria-label="Profile"
              className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-secondary-foreground"
            >
              {displayInitial}
            </Link>
            <div className="text-right">
              <Link href="/profile">
                <p className="text-sm font-medium">
                  <button className="rounded-md text-accent underline-offset-4 hover:underline">
                    {displayName}
                  </button>
                </p>
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl space-y-4 px-6 py-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-foreground/80">
          Welcome back, {displayName}. Here are your available app modules.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {appModules.map((title) => (
            <AppCard key={title} title={title} />
          ))}
        </div>
      </section>
    </main>
  );
}
