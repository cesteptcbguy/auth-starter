import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "KĀʻEO Auth Starter",
};

export default function Home() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-24">
      <h1 className="text-4xl font-bold tracking-tight text-card-foreground sm:text-5xl">
        KĀʻEO Auth Starter
      </h1>
      <p className="max-w-2xl text-pretty text-foreground/80">
        Email/password sign-in, password reset, and a mock dashboard—ready for
        your Supabase project.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button variant="secondary" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/reset-password">Forgot password?</Link>
        </Button>
      </div>
    </main>
  );
}
