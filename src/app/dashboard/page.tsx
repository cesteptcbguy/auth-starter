import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  deriveProfileInitial,
  deriveProfileName,
  getCurrentUserProfile,
  upsertUserProfile,
} from "@/lib/profile";

const isScreenshotMode = process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1";

export default async function Dashboard() {
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
      </main>
    );
  }

  // Normal mode
  const supabase = await createClient();
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
              <form action="/dashboard/signout" method="post">
                <button
                  className="text-xs font-medium text-primary underline"
                  formAction="/dashboard/signout"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl space-y-4 px-6 py-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {displayName}.</p>
      </section>
    </main>
  );
}
