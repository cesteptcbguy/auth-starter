// src/app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { AppWindow } from "lucide-react";

import { getServerSupabase } from "@/lib/supabase/server";
import {
  deriveProfileInitial,
  deriveProfileName,
  getCurrentUserProfile,
  upsertUserProfile,
} from "@/lib/profile";
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
      <Button className="mt-4">Open</Button>
    </article>
  );
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
              <div className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-secondary-foreground">
                {displayInitial}
              </div>
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

  // If missing, create it and try again
  if (!profile && user.email) {
    await upsertUserProfile(supabase, { id: user.id, email: user.email });
    ({ profile } = await getCurrentUserProfile(supabase, user.id));
  }

  const displayName = deriveProfileName(profile);
  const displayInitial = deriveProfileInitial(profile);

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
            <div className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-secondary-foreground">
              {displayInitial}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{displayName}</p>
              <SignOutButton className="text-xs font-medium text-primary underline-offset-4 hover:underline" />
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
