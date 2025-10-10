// src/app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  deriveProfileInitial,
  deriveProfileName,
  getCurrentUserProfile,
  upsertUserProfile,
} from "@/lib/profile";
import CollectionsGrid from "@/components/collections/CollectionsGrid";
import CreateCollection from "@/app/collections/_create";
import { SignOutButton } from "@/components/auth/SignOutButton";

const isScreenshotMode = process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1";

export default async function DashboardPage() {
  // Screenshot / mock mode (auth bypassed by middleware)
  if (isScreenshotMode) {
    const email = "teacher@boldbuilder.app";
    const displayName = "Jordan Teacher";
    const displayInitial = displayName.charAt(0);
    const demoCollections = [
      { id: "col_1001", name: "Spring Launch", created_at: null },
      { id: "col_1002", name: "STEM Workshops", created_at: null },
      { id: "col_1003", name: "Teacher Favorites", created_at: null },
    ];

    return (
      <main className="min-h-screen bg-background">
        <header className="border-b bg-card/60">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Signed in as
              </p>
              <p className="text-sm font-medium">{email}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                {displayInitial}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-5xl space-y-4 px-6 py-8">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {displayName}. Here is a quick look at today’s
            activity.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border bg-card p-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Collections
              </h2>
              <p className="mt-2 text-2xl font-semibold">18 active</p>
              <p className="text-xs text-muted-foreground">
                3 updated this week
              </p>
            </article>
            <article className="rounded-lg border bg-card p-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Assets
              </h2>
              <p className="mt-2 text-2xl font-semibold">124 published</p>
              <p className="text-xs text-muted-foreground">
                12 awaiting review
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-5xl space-y-4 px-6 pb-12">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">My Collections</h2>
            <CreateCollection />
            <CollectionsGrid collections={demoCollections} />
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
  const {
    data: collections,
    error: collectionsError,
  } = await supabase
    .from("collections")
    .select("id,name,created_at")
    .order("created_at", { ascending: false });

  if (collectionsError) {
    console.error("[dashboard] Failed to load collections:", collectionsError);
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Signed in as
            </p>
            <p className="text-sm font-medium">
              {profile?.email ?? user.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
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
        <p className="text-muted-foreground">Welcome back, {displayName}.</p>
        <div className="space-y-4 pt-6">
          <h2 className="text-xl font-semibold">My Collections</h2>
          <CreateCollection />
          <CollectionsGrid collections={collections} />
        </div>
      </section>
    </main>
  );
}
